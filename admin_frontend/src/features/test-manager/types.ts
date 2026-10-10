export type TestListItem = {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  question: number
  testCategory: string
  testTemplate: string
  isActive: boolean
  isPublished: boolean
}

export type TestListFilters = {
  name: string
  testCode: string
  categoryId: string
  templateId: string
  isDraft: string
  isPublished: string
  isActive: string
}

export const defaultTestListFilters: TestListFilters = {
  name: '',
  testCode: '',
  categoryId: '',
  templateId: '',
  isDraft: '',
  isPublished: '',
  isActive: '',
}
