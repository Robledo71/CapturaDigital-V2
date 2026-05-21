'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, Circle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ClienteKey =
  | 'Grupo Antolin'
  | 'Volkswagen de México'
  | 'Nemak'
  | 'Brose Querétaro'

interface Inspector {
  iniciales: string
  nombre: string
  codigo: string
  turno: string
  avatarColor: string
}

// ─── Static data ──────────────────────────────────────────────────────────────

const CLIENTES: ClienteKey[] = [
  'Grupo Antolin',
  'Volkswagen de México',
  'Nemak',
  'Brose Querétaro',
]

const PLANTAS: Record<ClienteKey, string[]> = {
  'Grupo Antolin': ['Silao 1', 'Silao 2', 'Silao 3'],
  'Volkswagen de México': ['Puebla – Nave 4', 'Puebla – Nave 7', 'Puebla – Nave 12'],
  Nemak: ['García N.L.', 'Monterrey Sur'],
  'Brose Querétaro': ['Querétaro El Marqués'],
}

const TURNOS = ['Turno A', 'Turno B', 'Turno C']

const INSPECTORES: Inspector[] = [
  {
    iniciales: 'MR',
    nombre: 'Marco A. Rivera',
    codigo: 'I-014',
    turno: 'Turno A',
    avatarColor: 'bg-blue-600',
  },
  {
    iniciales: 'EV',
    nombre: 'Elena Vázquez',
    codigo: 'I-022',
    turno: 'Turno A',
    avatarColor: 'bg-violet-600',
  },
  {
    iniciales: 'JC',
    nombre: 'Jorge Cisneros',
    codigo: 'I-031',
    turno: 'Turno B',
    avatarColor: 'bg-teal-600',
  },
  {
    iniciales: 'LG',
    nombre: 'Laura Gutiérrez',
    codigo: 'I-038',
    turno: 'Turno B',
    avatarColor: 'bg-indigo-600',
  },
  {
    iniciales: 'DO',
    nombre: 'Daniel Ortega',
    codigo: 'I-047',
    turno: 'Turno C',
    avatarColor: 'bg-orange-600',
  },
  {
    iniciales: 'AM',
    nombre: 'Ana Martínez',
    codigo: 'I-052',
    turno: 'Turno C',
    avatarColor: 'bg-rose-600',
  },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

interface FieldLabelProps {
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}

function FieldLabel({ htmlFor, required, children }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
      {children}
      {required && <span className="text-slate-400 ml-0.5" aria-hidden="true">*</span>}
    </label>
  )
}

interface FieldHintProps {
  children: React.ReactNode
}

function FieldHint({ children }: FieldHintProps) {
  return <p className="mt-1.5 text-xs text-slate-600">{children}</p>
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder: string
}

function Select({ placeholder, children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2.5 text-sm rounded-lg bg-blue-50/50 dark:bg-[#070e1a] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed appearance-none ${props.className ?? ''}`}
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {children}
    </select>
  )
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

function TextInput({ ...props }: TextInputProps) {
  return (
    <input
      type="text"
      {...props}
      className={`w-full px-3 py-2.5 text-sm rounded-lg bg-blue-50/50 dark:bg-[#070e1a] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors ${props.className ?? ''}`}
    />
  )
}

interface InspectorCardProps {
  inspector: Inspector
}

function InspectorCard({ inspector }: InspectorCardProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-lg border border-blue-200 dark:border-[#1a2d4d] bg-blue-50/50 dark:bg-[#070e1a]">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${inspector.avatarColor}`}
        aria-hidden="true"
      >
        <span className="text-blue-950 dark:text-white text-xs font-bold">{inspector.iniciales}</span>
      </div>
      <div className="min-w-0">
        <p className="text-slate-800 dark:text-slate-200 text-sm font-medium truncate">{inspector.nombre}</p>
        <p className="text-slate-500 text-xs mt-0.5">
          {inspector.codigo} · {inspector.turno}
        </p>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function NuevoReportePage() {
  const [cliente, setCliente] = useState<ClienteKey | ''>('')
  const [planta, setPlanta] = useState('')
  const [cotizacion, setCotizacion] = useState('')
  const [parte, setParte] = useState('')
  const [operadores, setOperadores] = useState('')
  const [turno, setTurno] = useState('')
  const [lote, setLote] = useState('')

  function handleClienteChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setCliente(e.target.value as ClienteKey | '')
    setPlanta('')
  }

  const plantasDisponibles = cliente ? PLANTAS[cliente] : []

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/supervisor/reportes"
              aria-label="Volver a reportes"
              className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Nuevo reporte de inspección
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <Send size={14} />
              Crear y enviar
            </button>
          </div>
        </div>

        {/* HU label */}
        <p className="text-xs text-slate-500 -mt-3">
        </p>

        {/* Form card */}
        <div className="rounded-xl border border-blue-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Datos del servicio</h2>
          </div>

          {/* Form body */}
          <div className="px-6 py-6 flex flex-col gap-6">

            {/* Row 1: Cliente + Planta */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <FieldLabel htmlFor="cliente" required>Cliente</FieldLabel>
                <Select
                  id="cliente"
                  placeholder="Seleccionar..."
                  value={cliente}
                  onChange={handleClienteChange}
                  required
                >
                  {CLIENTES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="planta" required>Planta</FieldLabel>
                <Select
                  id="planta"
                  placeholder={cliente ? 'Seleccionar planta...' : 'Selecciona cliente primero'}
                  value={planta}
                  onChange={(e) => setPlanta(e.target.value)}
                  disabled={!cliente}
                  required
                >
                  {plantasDisponibles.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Row 2: Cotización + # Parte */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <FieldLabel htmlFor="cotizacion" required>Cotización</FieldLabel>
                <TextInput
                  id="cotizacion"
                  placeholder="C-2026-0000"
                  value={cotizacion}
                  onChange={(e) => setCotizacion(e.target.value)}
                  required
                />
                <FieldHint>Validada contra CRM</FieldHint>
              </div>
              <div>
                <FieldLabel htmlFor="parte" required># Parte</FieldLabel>
                <TextInput
                  id="parte"
                  placeholder="AT-3349-B"
                  value={parte}
                  onChange={(e) => setParte(e.target.value)}
                  required
                />
                <FieldHint>Formato: 2–3 letras, guión, 3–4 dígitos</FieldHint>
              </div>
            </div>

            {/* Row 3: Operadores + Turno + Lote */}
            <div className="grid grid-cols-3 gap-5">
              <div>
                <FieldLabel htmlFor="operadores" required>Operadores</FieldLabel>
                <TextInput
                  id="operadores"
                  placeholder=""
                  value={operadores}
                  onChange={(e) => setOperadores(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="turno" required>Turno</FieldLabel>
                <Select
                  id="turno"
                  placeholder="Turno A"
                  value={turno}
                  onChange={(e) => setTurno(e.target.value)}
                  required
                >
                  {TURNOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="lote" required>Lote esperado (piezas)</FieldLabel>
                <TextInput
                  id="lote"
                  placeholder="ej. 4800"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  inputMode="numeric"
                  required
                />
              </div>
            </div>

            {/* Row 4: Inspectores asignados */}
            <div>
              <FieldLabel htmlFor="inspectores-grid" required>Inspectores asignados</FieldLabel>
              <div
                id="inspectores-grid"
                className="grid grid-cols-3 gap-3 mt-1"
                aria-label="Lista de inspectores asignados"
              >
                {INSPECTORES.map((inspector) => (
                  <InspectorCard key={inspector.codigo} inspector={inspector} />
                ))}
              </div>
            </div>

          </div>

          {/* Card footer */}
          <div className="px-6 py-3.5 border-t border-blue-200 dark:border-[#1a2d4d] flex items-center gap-2">
            <Circle size={12} className="text-slate-600 flex-shrink-0" aria-hidden="true" />
            <span className="text-xs text-slate-500">
              Creado por Carla Mendoza · 08 may 2026 00:00
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
