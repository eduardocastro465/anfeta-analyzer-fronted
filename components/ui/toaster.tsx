'use client'

import { useToast } from '@/hooks/use-toast'
import {
  Toast, ToastClose, ToastDescription,
  ToastProvider, ToastTitle, ToastViewport,
} from '@/components/ui/toast'
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const variantIcon = {
  success:     <CheckCircle2  className="w-3.5 h-3.5 text-green-500  shrink-0 mt-px" />,
  destructive: <AlertCircle   className="w-3.5 h-3.5 text-red-400    shrink-0 mt-px" />,
  warning:     <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-px" />,
  info:        <Info          className="w-3.5 h-3.5 text-blue-500   shrink-0 mt-px" />,
  default: null,
} as const

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => {
        const icon = variantIcon[(props.variant as keyof typeof variantIcon) ?? 'default']

        return (
          <Toast key={id} {...props} className="py-1.5 px-2.5 pr-5">
            <div className="flex items-start gap-1.5 flex-1 min-w-0">
              {icon}
              <div className="min-w-0">
                {title && (
                  <ToastTitle className="text-xs leading-snug">{title}</ToastTitle>
                )}
                {description && (
                  <ToastDescription className="text-xs leading-snug opacity-80 line-clamp-2">
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}