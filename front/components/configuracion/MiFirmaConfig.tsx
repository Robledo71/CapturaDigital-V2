'use client'

import { startTransition, useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eraser, Loader2, PenLine, Trash2, Upload } from 'lucide-react'
import { subirFirmaAction, borrarFirmaAction } from '@/app/actions/signature'

interface MiFirmaConfigProps {
  /** ¿El usuario ya tenía una firma configurada al cargar la página? */
  hasSignatureInicial: boolean
}

type Mode = 'draw' | 'upload'

export function MiFirmaConfig({ hasSignatureInicial }: MiFirmaConfigProps) {
  const router = useRouter()
  const [hasSignature, setHasSignature] = useState(hasSignatureInicial)
  const [cacheBuster, setCacheBuster] = useState(() => Date.now())
  const [mode, setMode] = useState<Mode>('draw')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  })

  // subirFirmaAction se invoca imperativamente (no vía <form action>) porque el
  // contenido sale del canvas (blob) o de un <input type="file"> ya leído en
  // estado — armamos el FormData a mano. Al llamar el dispatcher de useActionState
  // fuera de un form, DEBE envolverse en startTransition (ver handleSaveDraw/Upload).
  const [uploadState, uploadAction, isUploading] = useActionState(subirFirmaAction, undefined)
  const [deleting, setDeleting] = useState(false)

  // ── Dibujar ────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const [hasDrawing, setHasDrawing] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
  }, [])

  function getPos(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawing(true)
  }

  function handlePointerUp() {
    isDrawingRef.current = false
  }

  function handleClearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawing(false)
  }

  function handleSaveDraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'firma.png', { type: 'image/png' })
      const fd = new FormData()
      fd.append('signature', file)
      // El dispatcher de useActionState debe invocarse dentro de una transición.
      startTransition(() => uploadAction(fd))
    }, 'image/png')
  }

  // ── Cargar imagen ────────────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : null
    })
  }

  function handleSaveUpload() {
    if (!selectedFile) return
    const fd = new FormData()
    fd.append('signature', selectedFile)
    // El dispatcher de useActionState debe invocarse dentro de una transición.
    startTransition(() => uploadAction(fd))
  }

  // Limpia el object URL de la vista previa al desmontar / cambiar de archivo
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // ── Resultado de subir/borrar ────────────────────────────────────────────────
  useEffect(() => {
    if (!uploadState) return
    if (uploadState.ok) {
      setHasSignature(true)
      setCacheBuster(Date.now())
      setHasDrawing(false)
      setSelectedFile(null)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setToast({ message: 'Firma guardada correctamente', type: 'success', visible: true })
      router.refresh()
    } else {
      setToast({ message: uploadState.error, type: 'error', visible: true })
    }
  }, [uploadState, router])

  useEffect(() => {
    if (!toast.visible) return
    const t = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000)
    return () => clearTimeout(t)
  }, [toast.visible])

  async function handleDelete() {
    setDeleting(true)
    const result = await borrarFirmaAction()
    setDeleting(false)
    if (result?.ok) {
      setHasSignature(false)
      setCacheBuster(Date.now())
      setToast({ message: 'Firma eliminada', type: 'success', visible: true })
      router.refresh()
    } else {
      setToast({
        message: result && 'error' in result ? result.error : 'No se pudo eliminar la firma',
        type: 'error',
        visible: true,
      })
    }
  }

  const tabCls = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'
    }`

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mi firma</h1>
        <p className="mt-1 text-sm text-slate-500">
          Esta firma se usa para firmar los reportes. Es obligatoria para poder firmar.
        </p>
      </div>

      {/* Firma actual */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#0c1829] dark:bg-[#0c1829] dark:shadow-none">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Firma actual</h2>
        {hasSignature ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex h-24 w-full max-w-[240px] items-center justify-center rounded-lg border border-slate-200 bg-white p-2 dark:border-[#1a2d4d]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/signatures/me?t=${cacheBuster}`}
                alt="Tu firma actual"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              {deleting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              <Trash2 size={14} aria-hidden="true" />
              Eliminar firma
            </button>
          </div>
        ) : (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
            Aún no tienes una firma configurada. No podrás firmar reportes hasta que crees una.
          </p>
        )}
      </div>

      {/* Crear / reemplazar firma */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#0c1829] dark:bg-[#0c1829] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {hasSignature ? 'Reemplazar firma' : 'Crear firma'}
          </h2>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5">
            <button
              type="button"
              aria-pressed={mode === 'draw'}
              onClick={() => setMode('draw')}
              className={tabCls(mode === 'draw')}
            >
              <PenLine size={14} aria-hidden="true" />
              Dibujar
            </button>
            <button
              type="button"
              aria-pressed={mode === 'upload'}
              onClick={() => setMode('upload')}
              className={tabCls(mode === 'upload')}
            >
              <Upload size={14} aria-hidden="true" />
              Cargar imagen
            </button>
          </div>
        </div>

        {mode === 'draw' ? (
          <div className="flex flex-col gap-3">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              aria-label="Área para dibujar tu firma con el mouse o el dedo"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full touch-none rounded-lg border border-slate-200 bg-white dark:border-[#1a2d4d]"
              style={{ aspectRatio: '3 / 1' }}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClearCanvas}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:border-[#31476f] dark:text-slate-300 dark:hover:bg-white/10"
              >
                <Eraser size={14} aria-hidden="true" />
                Limpiar
              </button>
              <button
                type="button"
                onClick={handleSaveDraw}
                disabled={!hasDrawing || isUploading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                Guardar firma
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label
              htmlFor="firma-file-input"
              className="text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Imagen de firma (PNG o JPG, máx. 5 MB)
            </label>
            <input
              id="firma-file-input"
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-500 dark:text-slate-300"
            />
            {previewUrl && (
              <div className="flex h-24 w-full max-w-[240px] items-center justify-center rounded-lg border border-slate-200 bg-white p-2 dark:border-[#1a2d4d]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Vista previa de la firma seleccionada" className="max-h-full max-w-full object-contain" />
              </div>
            )}
            <button
              type="button"
              onClick={handleSaveUpload}
              disabled={!selectedFile || isUploading}
              className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              Guardar firma
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-3.5 shadow-2xl transition-all animate-slide-in-right ${
            toast.type === 'success'
              ? 'border-green-500/50 bg-white dark:bg-[#0c1829]'
              : 'border-red-500/30 bg-white dark:bg-[#0c1829]'
          }`}
        >
          <span
            className={`h-2 w-2 flex-shrink-0 rounded-full ${
              toast.type === 'success' ? 'bg-green-400 animate-pulse-dot' : 'bg-red-400'
            }`}
            aria-hidden="true"
          />
          <span className="text-sm text-slate-700 dark:text-slate-200">{toast.message}</span>
        </div>
      )}
    </div>
  )
}
