// supabase/functions/paystack-webhook/index.ts
// Receives Paystack webhook events and updates the accounts table.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface PaystackEvent {
  event: string
  data: {
    id: number
    reference: string
    amount: number
    currency: string
    status: string
    paid_at?: string
    customer: {
      email: string
      customer_code: string
    }
    metadata?: {
      account_id?: string
      purchase_type?: string
      account_name?: string
      event_end_date?: string
    }
    plan?: {
      plan_code: string
      name: string
    }
    subscription_code?: string
    next_payment_date?: string
    plan_object?: {
      plan_code: string
    }
    cron_expression?: string
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Read raw body for signature verification
    const rawBody = await req.text()

    // Verify signature
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      console.warn('Webhook: missing signature')
      return new Response('Missing signature', { status: 401 })
    }

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(paystackSecret),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
    const computed = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (computed !== signature) {
      console.warn('Webhook: signature mismatch')
      return new Response('Invalid signature', { status: 401 })
    }

    // Parse the event
    const event: PaystackEvent = JSON.parse(rawBody)
    console.log('Paystack webhook:', event.event, event.data.reference)

    // Service role client - bypasses RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const accountId = event.data.metadata?.account_id
    const purchaseType = event.data.metadata?.purchase_type

    if (!accountId || !purchaseType) {
      console.warn('Webhook: missing account_id or purchase_type in metadata')
      return new Response('Missing metadata', { status: 400 })
    }

    // Handle charge.success (all purchase types go through this)
    if (event.event === 'charge.success') {
      const planCode = event.data.plan?.plan_code ?? null
      const customerCode = event.data.customer.customer_code
      const subscriptionCode = event.data.subscription_code ?? null

      if (purchaseType === 'v1' || purchaseType === 'v2') {
        // Subscription payment
        const tier = purchaseType === 'v1' ? 'v1' : 'v2'
        const periodEnd = new Date()
        periodEnd.setDate(periodEnd.getDate() + 30)

        const { error } = await supabase
          .from('accounts')
          .update({
            tier,
            billing_type: 'subscription',
            subscription_status: 'active',
            paystack_customer_code: customerCode,
            paystack_subscription_code: subscriptionCode,
            paystack_plan_code: planCode,
            current_period_end: periodEnd.toISOString(),
            access_expires_at: periodEnd.toISOString(),
            paid_at: new Date().toISOString(),
            cancel_at_period_end: false,
          })
          .eq('id', accountId)

        if (error) {
          console.error('Webhook: failed to update account:', error)
          return new Response('DB error', { status: 500 })
        }

        // Log audit
        await supabase.from('account_limit_changes').insert({
          account_id: accountId,
          field: 'subscription_activated',
          old_value: null,
          new_value: tier + ' active until ' + periodEnd.toISOString(),
        })

        console.log('Activated ' + tier + ' for account ' + accountId)
      } else if (purchaseType === 'event_pass') {
        // One-time event pass
        const eventEndDate = event.data.metadata?.event_end_date
        if (!eventEndDate) {
          console.error('Webhook: event_pass missing event_end_date')
          return new Response('Missing event date', { status: 400 })
        }

        const expiresAt = new Date(eventEndDate)
        // Add 1 day buffer so it expires end of event day
        expiresAt.setDate(expiresAt.getDate() + 1)

        const { error } = await supabase
          .from('accounts')
          .update({
            tier: 'v1',
            billing_type: 'one_time',
            subscription_status: 'active',
            paystack_customer_code: customerCode,
            paystack_plan_code: null,
            current_period_end: null,
            access_expires_at: expiresAt.toISOString(),
            paid_at: new Date().toISOString(),
            cancel_at_period_end: false,
            max_participants: 200,
            max_programs: 10,
            max_contexts: 100,
            max_kiosks: 5,
          })
          .eq('id', accountId)

        if (error) {
          console.error('Webhook: failed to update event pass:', error)
          return new Response('DB error', { status: 500 })
        }

        await supabase.from('account_limit_changes').insert({
          account_id: accountId,
          field: 'event_pass_activated',
          old_value: null,
          new_value: 'Expires ' + expiresAt.toISOString(),
        })

        console.log('Activated event pass for account ' + accountId)
      }

      return new Response('OK', { status: 200 })
    }

    // Handle subscription.not_renew - sets cancel_at_period_end
    if (event.event === 'subscription.not_renew') {
      const { error } = await supabase
        .from('accounts')
        .update({ cancel_at_period_end: true })
        .eq('id', accountId)

      if (error) {
        console.error('Webhook: failed to set cancel flag:', error)
        return new Response('DB error', { status: 500 })
      }

      await supabase.from('account_limit_changes').insert({
        account_id: accountId,
        field: 'subscription_cancelling',
        old_value: null,
        new_value: 'Will end at period end',
      })

      return new Response('OK', { status: 200 })
    }

    // Handle subscription.disable - subscription fully ended
    if (event.event === 'subscription.disable') {
      const { error } = await supabase
        .from('accounts')
        .update({
          subscription_status: 'canceled',
          cancel_at_period_end: false,
        })
        .eq('id', accountId)

      if (error) {
        console.error('Webhook: failed to cancel:', error)
        return new Response('DB error', { status: 500 })
      }

      await supabase.from('account_limit_changes').insert({
        account_id: accountId,
        field: 'subscription_canceled',
        old_value: null,
        new_value: 'Subscription disabled at period end',
      })

      return new Response('OK', { status: 200 })
    }

    // Handle invoice.payment_failed - subscription renew failed
    if (event.event === 'invoice.payment_failed') {
      await supabase
        .from('accounts')
        .update({ subscription_status: 'past_due' })
        .eq('id', accountId)

      await supabase.from('account_limit_changes').insert({
        account_id: accountId,
        field: 'payment_failed',
        old_value: null,
        new_value: 'Subscription renewal failed',
      })

      return new Response('OK', { status: 200 })
    }

    // Any other event - just ack
    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('paystack-webhook error:', err)
    return new Response('Server error', { status: 500 })
  }
})