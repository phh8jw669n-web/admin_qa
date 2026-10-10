import { Navigate, Route, Routes } from 'react-router-dom'

import { ForgotPasswordPage } from '@/app/forgot-password/page'
import { LoginPage } from '@/app/login/page'
import { AppLayout } from '@/app/layout'
import { CategoryManagementPage } from '@/app/category-management/page'
import { DashboardPage } from '@/app/dashboard/page'
import { QuestionBankPage } from '@/app/question-bank/page'
import { TestManagerListPage } from '@/app/test-manager/list/page'
import { TestWizardPage } from '@/app/test-manager/wizard/page'
import { WorkspacesPage } from '@/app/workspaces/page'
import { CompaniesPage } from '@/app/companies/page'
import { ProtectedRoute, RootRedirect } from '@/components/auth/protected-route'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<ProtectedRoute scope="platform" />}>
        <Route element={<AppLayout />}>
          <Route
            path="workspaces"
            element={
              <ProtectedRoute permission="workspaces:view">
                <WorkspacesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="companies"
            element={
              <ProtectedRoute permission="companies:view">
                <CompaniesPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Route>

      <Route path="/w/:workspaceSlug">
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<ProtectedRoute scope="workspace" />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute permission="dashboard:view">
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="test-manager"
              element={
                <ProtectedRoute permission="test-manager:view">
                  <TestManagerListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="test-manager/wizard/:step"
              element={
                <ProtectedRoute permission="test-manager:create">
                  <TestWizardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="question-bank"
              element={
                <ProtectedRoute permission="question-bank:view">
                  <QuestionBankPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="category-management"
              element={
                <ProtectedRoute permission="category:view">
                  <CategoryManagementPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
