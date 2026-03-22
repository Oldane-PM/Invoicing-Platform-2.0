# Invoicing Platform 2.0 — File Structure

```
Invoicing-Platform-2.0/
├── .env                          # Environment variables
├── .env.example                  # Env template
├── .gitignore
├── index.html                    # Vite entry HTML
├── package.json
├── package-lock.json
├── tsconfig.json                 # Frontend TS config
├── tsconfig.node.json            # Node TS config
├── tsconfig.server.json          # Server TS config
├── vite.config.ts                # Vite build config
├── postcss.config.mjs            # PostCSS config
├── nodemon.json                  # Dev server auto-reload
├── TODO.md
│
├── # ── Deployment ──────────────────────────────────
├── netlify.toml                  # Netlify deploy config
├── railway.toml                  # Railway deploy config
├── render.yaml                   # Render deploy config
├── vercel.json                   # Vercel deploy config
│
├── Doc/                          # Project documentation
│   ├── ATTRIBUTIONS.md
│   ├── DEPLOYMENT.md
│   ├── Guidelines.md
│   ├── PRODUCTION_CHECKLIST.md
│   ├── QUICK_START.md
│   ├── RAILWAY_DEPLOYMENT.md
│   ├── README.md
│   ├── RENDER_DEPLOYMENT.md
│   ├── SERVER_SETUP.md
│   └── structure.md              # ← This file
│
├── docs/
│   └── audits/
│       └── hardcoded-data-audit.md
│
├── Server/                       # Express backend
│   ├── env.ts                    # Server env config
│   ├── server.ts                 # Express app entry
│   ├── clients/
│   │   └── supabase.server.ts    # Server-side Supabase client
│   ├── controllers/
│   │   ├── invoice.controller.ts
│   │   └── user.controller.ts
│   ├── routes/
│   │   ├── invoice.routes.ts
│   │   ├── oauth-callback.routes.ts
│   │   └── user.routes.ts
│   └── services/
│       └── invoices/
│           ├── index.ts
│           ├── generateInvoicePdf.ts
│           ├── invoiceNumber.ts
│           └── invoiceStorage.ts
│
├── supabase/                     # Supabase project config
│   └── migrations/               # 41 SQL migration files
│
└── src/                          # React frontend (Vite + TypeScript)
    ├── App.tsx                   # Root app + router
    ├── main.tsx                  # Vite entry point
    ├── vite-env.d.ts
    │
    ├── styles/
    │   ├── fonts.css
    │   ├── index.css
    │   ├── tailwind.css
    │   └── theme.css
    │
    ├── pages/
    │   ├── auth/
    │   │   ├── Login.tsx
    │   │   └── OAuthCallback.tsx
    │   ├── admin/
    │   │   ├── Calendar.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── EmployeeDirectory.tsx
    │   │   ├── Projects.tsx
    │   │   └── UserAccessManagement.tsx
    │   ├── contractor/
    │   │   ├── Dashboard.tsx
    │   │   ├── Profile.tsx
    │   │   ├── Submissions.tsx
    │   │   └── SubmitHours.tsx
    │   ├── manager/
    │   │   ├── Dashboard.tsx
    │   │   └── Team.tsx
    │   └── unassigned/
    │       └── Dashboard.tsx
    │
    ├── components/
    │   ├── sign-in.tsx
    │   ├── drawers/
    │   │   ├── ContractorDetailDrawer.tsx
    │   │   ├── ContractorSubmissionDrawer.tsx
    │   │   ├── ManagerSubmissionDrawer.tsx
    │   │   ├── NotificationsDrawer.tsx
    │   │   └── SubmissionReviewDrawer.tsx
    │   ├── modals/
    │   │   ├── AddContractorDialog.tsx
    │   │   ├── AddProjectDialog.tsx
    │   │   ├── NewUserModal.tsx
    │   │   ├── ProjectAssignmentsDialog.tsx
    │   │   ├── ProjectDialog.tsx
    │   │   ├── SubmitHoursModal.tsx
    │   │   └── SuccessModal.tsx
    │   ├── pdf/
    │   │   └── PDFInvoiceViewer.tsx
    │   ├── shared/
    │   │   ├── Combobox.tsx
    │   │   ├── ErrorBoundary.tsx
    │   │   ├── InvoiceButton.tsx
    │   │   ├── MetricCard.tsx
    │   │   ├── MultiMonthSelector.tsx
    │   │   ├── NotificationBell.tsx
    │   │   ├── NotificationDrawer.tsx
    │   │   ├── RoleChangeConfirmationModal.tsx
    │   │   ├── SubmissionCard.tsx
    │   │   ├── SubmissionStatusPill.tsx
    │   │   └── figma/
    │   │       └── ImageWithFallback.tsx
    │   └── ui/                   # shadcn/ui primitives (48 files)
    │       ├── index.ts
    │       ├── accordion.tsx
    │       ├── alert-dialog.tsx
    │       ├── alert.tsx
    │       ├── aspect-ratio.tsx
    │       ├── avatar.tsx
    │       ├── badge.tsx
    │       ├── breadcrumb.tsx
    │       ├── button.tsx
    │       ├── calendar.tsx
    │       ├── card.tsx
    │       ├── carousel.tsx
    │       ├── chart.tsx
    │       ├── checkbox.tsx
    │       ├── collapsible.tsx
    │       ├── command.tsx
    │       ├── context-menu.tsx
    │       ├── dialog.tsx
    │       ├── drawer.tsx
    │       ├── dropdown-menu.tsx
    │       ├── form.tsx
    │       ├── hover-card.tsx
    │       ├── input-otp.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── menubar.tsx
    │       ├── navigation-menu.tsx
    │       ├── pagination.tsx
    │       ├── popover.tsx
    │       ├── progress.tsx
    │       ├── radio-group.tsx
    │       ├── resizable.tsx
    │       ├── scroll-area.tsx
    │       ├── select.tsx
    │       ├── separator.tsx
    │       ├── sheet.tsx
    │       ├── sidebar.tsx
    │       ├── skeleton.tsx
    │       ├── slider.tsx
    │       ├── sonner.tsx
    │       ├── switch.tsx
    │       ├── table.tsx
    │       ├── tabs.tsx
    │       ├── textarea.tsx
    │       ├── toggle-group.tsx
    │       ├── toggle.tsx
    │       ├── tooltip.tsx
    │       └── use-mobile.ts
    │
    └── lib/
        ├── auth.ts               # Auth helpers
        ├── auth-client.ts        # Auth client init
        │
        ├── calculations/
        │   ├── index.ts
        │   ├── submissions.ts
        │   └── __tests__/
        │       └── submissions.test.ts
        │
        ├── helpers/
        │   └── auth-helpers.ts
        │
        ├── types/
        │   └── index.ts          # Shared TypeScript types
        │
        ├── utils/
        │   ├── cn.ts             # className merge utility
        │   └── index.ts          # General utilities
        │
        ├── supabase/
        │   ├── client.ts         # Browser Supabase client
        │   └── repos/            # Data-access repositories
        │       ├── index.ts
        │       ├── auth.repo.ts
        │       ├── contractorProfile.repo.ts
        │       ├── employeeDirectory.repo.ts
        │       ├── managerDashboard.repo.ts
        │       ├── managerSubmissions.repo.ts
        │       ├── projectAssignments.repo.ts
        │       ├── projects.repo.ts
        │       ├── submissions.repo.ts
        │       └── team.repo.ts
        │
        ├── data/                 # Domain data layers (repos + types + mappers)
        │   ├── index.ts
        │   ├── submissionsDataSource.ts
        │   ├── adminCalendar/
        │   │   ├── index.ts
        │   │   ├── adminCalendar.repo.ts
        │   │   ├── adminCalendar.types.ts
        │   │   └── adminCalendar.mappers.ts
        │   ├── adminDashboard/
        │   │   ├── index.ts
        │   │   ├── adminDashboard.repo.ts
        │   │   ├── adminDashboard.types.ts
        │   │   └── adminDashboard.mappers.ts
        │   ├── adminManagers/
        │   │   ├── index.ts
        │   │   ├── adminManagers.repo.ts
        │   │   └── adminManagers.types.ts
        │   ├── contractInfo/
        │   │   ├── index.ts
        │   │   ├── contractInfo.repo.ts
        │   │   └── contractInfo.types.ts
        │   ├── notifications/
        │   │   ├── index.ts
        │   │   ├── notifications.repo.ts
        │   │   ├── notifications.types.ts
        │   │   └── notifications.mappers.ts
        │   └── userAccess/
        │       ├── index.ts
        │       ├── userAccess.repo.ts
        │       ├── userAccess.types.ts
        │       └── userAccess.mappers.ts
        │
        └── hooks/                # React Query hooks
            ├── queryKeys.ts
            ├── useAuth.ts
            ├── admin/
            │   ├── useContractorSubmissions.ts
            │   ├── useEmployeeDirectory.ts
            │   ├── useEmployeeRoles.ts
            │   ├── useManagerOptions.ts
            │   ├── useProjectAssignments.ts
            │   ├── useProjects.ts
            │   ├── useUpdateContractInfo.ts
            │   └── useUpdateManagerAssignment.ts
            ├── adminCalendar/
            │   ├── index.ts
            │   ├── useAdminCalendar.ts
            │   ├── useAdminCalendarState.ts
            │   ├── useAffectedCount.ts
            │   ├── useCalendarEntries.ts
            │   ├── useCreateCalendarEntry.ts
            │   ├── useDeleteCalendarEntry.ts
            │   ├── useUpcomingDaysOff.ts
            │   └── useUpdateCalendarEntry.ts
            ├── adminDashboard/
            │   ├── index.ts
            │   ├── useAdminMetrics.ts
            │   ├── useAdminSubmissions.ts
            │   ├── useSubmissionActions.ts
            │   └── useSubmissionDetails.ts
            ├── contractor/
            │   ├── index.ts
            │   ├── useContractorProfile.ts
            │   ├── useContractorProjects.ts
            │   ├── useCreateSubmission.ts
            │   ├── useDeleteSubmission.ts
            │   ├── useSubmissions.ts
            │   └── useSubmittedPeriods.ts
            ├── invoices/
            │   ├── index.ts
            │   └── useInvoice.ts
            ├── manager/
            │   ├── index.ts
            │   ├── useAvailableContractors.ts
            │   ├── useManagerDashboard.ts
            │   ├── useManagerSubmissions.ts
            │   ├── useSubmissionActions.ts
            │   ├── useSubmissionDetails.ts
            │   └── useTeam.ts
            ├── notifications/
            │   ├── index.ts
            │   ├── useMarkAllNotificationsRead.ts
            │   ├── useMarkNotificationRead.ts
            │   ├── useNotifications.ts
            │   └── useUnreadNotificationCount.ts
            └── userAccess/
                ├── index.ts
                ├── useCurrentUserId.ts
                ├── useSetUserEnabled.ts
                ├── useUpdateUserRole.ts
                └── useUserAccessUsers.ts
```
