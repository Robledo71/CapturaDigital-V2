import { MessageCircle } from 'lucide-react'

// Número de WhatsApp de soporte técnico TI (formato internacional sin "+").
const SUPPORT_WHATSAPP = '524492737260'
const SUPPORT_MESSAGE =
  'Hola, necesito soporte técnico de TI. Estoy presentando una falla en el portal de Captura Digital.'

/**
 * Botón flotante (FAB) de soporte técnico TI.
 * Aparece fijo en la esquina inferior derecha de todas las pantallas del
 * portal del supervisor y abre WhatsApp con un mensaje prellenado.
 * Se expande mostrando la etiqueta "Soporte TI" al pasar el cursor.
 */
export function SupportButton() {
  const href = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soporte técnico TI por WhatsApp"
      title="Soporte técnico TI"
      className="group fixed bottom-6 right-6 z-50 flex items-center h-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-green-400/60 focus:ring-offset-2 focus:ring-offset-transparent"
    >
      <span className="flex h-14 w-14 items-center justify-center flex-shrink-0">
        <MessageCircle size={26} aria-hidden="true" />
      </span>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 ease-out group-hover:max-w-[160px] group-hover:pr-5 group-focus:max-w-[160px] group-focus:pr-5">
        Soporte TI
      </span>
    </a>
  )
}
