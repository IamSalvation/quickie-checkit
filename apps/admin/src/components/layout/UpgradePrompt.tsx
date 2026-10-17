import Modal from '../ui/Modal'

export type CapResource = 'participants' | 'programs' | 'contexts' | 'kiosks'

interface Props {
  open: boolean
  onClose: () => void
  resource: CapResource
  used: number
  cap: number
  accountName: string
}

const CONTACT_EMAIL = 'obiorajoshua@gmail.com'

const RESOURCE_LABEL: Record<CapResource, string> = {
  participants: 'participants',
  programs: 'programs',
  contexts: 'sessions this month',
  kiosks: 'kiosks',
}

export default function UpgradePrompt({
  open,
  onClose,
  resource,
  used,
  cap,
  accountName,
}: Props) {
  const label = RESOURCE_LABEL[resource]

  const mailSubject = encodeURIComponent(
    'Increase ' + label + ' limit for ' + accountName
  )
  const mailBody = encodeURIComponent(
    'Hi,\n\n' +
    'Our account "' +
    accountName +
    '" has reached its ' +
    label +
    ' limit (' +
    used +
    ' of ' +
    cap +
    ').\n\n' +
    'Please increase our limit or upgrade our plan.\n\n' +
    'Thanks.'
  )
  const mailtoUrl =
    'mailto:' + CONTACT_EMAIL + '?subject=' + mailSubject + '&body=' + mailBody

  return (
    <Modal open={open} onClose={onClose} title="You have reached a limit">
      <div className="space-y-4">
        <div className="rounded bg-amber-50 border border-amber-200 px-3 py-3 text-sm text-amber-900">
          <div className="font-medium">
            {used} of {cap} {label} used
          </div>
          <div className="mt-1 text-xs text-amber-800">
            You have reached your {label} limit. To add more, contact support
            to raise your limit or upgrade your plan.
          </div>
        </div>

        <div className="rounded bg-slate-50 border border-slate-200 px-3 py-3 text-xs text-slate-700">
          <div className="font-medium text-slate-900">What happens next?</div>
          <ul className="mt-1.5 space-y-1 list-disc pl-4">
            <li>Your existing data is safe - nothing gets deleted.</li>
            <li>
              You can still view, edit, and export everything you already have.
            </li>
            <li>New {label} cannot be created until your limit is raised.</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <a
            href={mailtoUrl}
            className="rounded bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
          >
            Contact support
          </a>
        </div>

        <p className="pt-1 text-center text-[11px] text-slate-400">
          {CONTACT_EMAIL}
        </p>
      </div>
    </Modal>
  )
}