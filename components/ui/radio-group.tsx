"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
  value: string | undefined
  onValueChange: (value: string) => void
} | null>(null)

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function RadioGroup({
  className,
  value: controlledValue,
  defaultValue,
  onValueChange,
  ...props
}: RadioGroupProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue

  const handleChange = (val: string) => {
    if (!isControlled) setUncontrolledValue(val)
    onValueChange?.(val)
  }

  return (
    <RadioGroupContext.Provider value={{ value, onValueChange: handleChange }}>
      <div role="radiogroup" className={cn("flex gap-2", className)} {...props} />
    </RadioGroupContext.Provider>
  )
}

export interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
  label: React.ReactNode
}

export function RadioGroupItem({ value, label, className, ...props }: RadioGroupItemProps) {
  const ctx = React.useContext(RadioGroupContext)
  if (!ctx) throw new Error("RadioGroupItem must be used within a RadioGroup")
  const checked = ctx.value === value
  return (
    <label className={cn("inline-flex items-center gap-1 cursor-pointer", className)}>
      <input
        type="radio"
        value={value}
        checked={checked}
        onChange={() => ctx.onValueChange(value)}
        className="accent-primary h-4 w-4"
        {...props}
      />
      <span>{label}</span>
    </label>
  )
} 