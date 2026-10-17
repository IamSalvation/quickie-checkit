// supabase/functions/paystack-initialize/index.ts
// Creates a Paystack transaction and returns the checkout URL.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  account_id: string
  purchase_type: 'v1' | 'v2' | 'event_pass'
  event_end_date?: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'No auth header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')!
    const planV1 = Deno.env.get('PAYSTACK_PLAN_V1')!
    const planV2 = Deno.env.get('PAYSTACK_PLAN_V2')!
    const eventPassAmount = Deno.env.get('PAYSTACK_EVENT_PASS_AMOUNT')!
    const appUrl = Deno.env.get('APP_URL')!

    // Client with the user's JWT - RLS applies
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Validate user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return json({ error: 'Not authenticated' }, 401)
    }

    // Read the request body
    const body: RequestBody = await req.json()
    const { account_id, purchase_type, event_end_date } = body

    if (!account_id || !purchase_type) {
      return json({ error: 'account_id and purchase_type required' }, 400)
    }

    // Fetch account to validate
    const { data: account, error: acctErr } = await supabase
      .from('accounts')
      .select('id, name, preset, status, tier, access_expires_at')
      .eq('id', account_id)
      .maybeSingle()

    if (acctErr || !account) {
      return json({ error: 'Account not found' }, 404)
    }

    // Fetch operator (to check ownership and get email)
    const { data: operator } = await supabase
      .from('operators')
      .select('id, email, account_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!operator || operator.account_id !== account_id) {
      return json({ error: 'Not authorized for this account' }, 403)
    }

    // Build the Paystack request
    const paystackBody: Record<string, unknown> = {
      email: operator.email,
      callback_url: appUrl + '/billing/callback',
      metadata: {
        account_id,
        purchase_type,
        account_name: account.name,
      },
    }

    if (purchase_type === 'v1') {
      // V1 monthly subscription
      paystackBody.plan = planV1
    } else if (purchase_type === 'v2') {
      // V2 monthly subscription
      paystackBody.plan = planV2
    } else if (purchase_type === 'event_pass') {
      // One-time event pass
      if (!event_end_date) {
        return json(
          { error: 'event_end_date required for event pass' },
          400
        )
      }

      // Validate event_end_date is within 180 days
      const endDate = new Date(event_end_date)
      const now = new Date()
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 180)

      if (isNaN(endDate.getTime())) {
        return json({ error: 'Invalid event_end_date' }, 400)
      }
      if (endDate <= now) {
        return json({ error: 'event_end_date must be in the future' }, 400)
      }
      if (endDate > maxDate) {
        return json(
          { error: 'event_end_date cannot be more than 180 days out' },
          400
        )
      }

      paystackBody.amount = parseInt(eventPassAmount, 10)
      paystackBody.metadata.event_end_date = event_end_date
    }

    // Call Paystack
    const paystackRes = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + paystackSecret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paystackBody),
      }
    )

    const paystackData = await paystackRes.json()

    if (!paystackRes.ok || !paystackData.status) {
      return json(
        {
          error:
            'Paystack error: ' + (paystackData.message ?? 'unknown error'),
        },
        500
      )
    }

    return json({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
    })
  } catch (err) {
    console.error('paystack-initialize error:', err)
    return json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      500
    )
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}