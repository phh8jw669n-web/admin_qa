import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { DynamicFilterBarProps } from './types'

export function DynamicFilterBar({ criteria, onSearch }: DynamicFilterBarProps) {
  const [selectedCriterion, setSelectedCriterion] = useState(criteria[0]?.value ?? '')
  const [filterValue, setFilterValue] = useState('')

  const activeCriterion = criteria.find((criterion) => criterion.value === selectedCriterion)

  const handleSearch = () => {
    if (!activeCriterion) return
    onSearch(activeCriterion.field.key, filterValue)
  }

  return (
    <div className="panel flex flex-wrap items-end gap-3 rounded-md p-4">
      <div className="space-y-2">
        <Label>Filter by</Label>
        <Select value={selectedCriterion} onValueChange={setSelectedCriterion}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select criterion" />
          </SelectTrigger>
          <SelectContent>
            {criteria.map((criterion) => (
              <SelectItem key={criterion.value} value={criterion.value}>
                {criterion.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeCriterion?.field.type === 'text' && (
        <div className="space-y-2">
          <Label>{activeCriterion.field.label}</Label>
          <Input
            value={filterValue}
            onChange={(event) => setFilterValue(event.target.value)}
            placeholder={`Search ${activeCriterion.field.label.toLowerCase()}`}
            className="w-[240px]"
          />
        </div>
      )}

      {activeCriterion?.field.type === 'select' && (
        <div className="space-y-2">
          <Label>{activeCriterion.field.label}</Label>
          <Select value={filterValue} onValueChange={setFilterValue}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {activeCriterion.field.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {activeCriterion?.field.type === 'date-range' && (
        <div className="space-y-2">
          <Label>{activeCriterion.field.label}</Label>
          <Input
            type="date"
            value={filterValue}
            onChange={(event) => setFilterValue(event.target.value)}
            className="w-[240px]"
          />
        </div>
      )}

      <Button onClick={handleSearch}>Apply</Button>
    </div>
  )
}
