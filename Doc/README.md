
  # Invoice App v2.0

  A comprehensive invoice management platform for contractors, managers, and administrators. Built with React, TypeScript, and Tailwind CSS.

  ## 🚀 Features

  ### Admin Portal
  - **Dashboard**: System overview with metrics and financial monitoring
  - **Employee Directory**: Manage contractor information and contracts
  - **User Access Management**: Control user roles and permissions
  - **Calendar**: Manage holidays and special time off
  - **Submission Review**: Approve or reject contractor submissions

  ### Manager Portal
  - **Dashboard**: Team overview with pending approvals
  - **Team View**: Manage team members and their submissions
  - **Submission Review**: Approve or reject team submissions with notes

  ### Contractor Portal
  - **Dashboard**: View submission history and status
  - **Submit Hours**: Submit work hours for approval
  - **Profile Management**: Update personal and banking information
  - **Invoice Generation**: Generate and view PDF invoices

  ## 📋 Prerequisites

  - Node.js 18 or higher
  - npm or pnpm package manager

  ## 🛠️ Installation

  1. Clone the repository:
  ```bash
  git clone <your-repo-url>
  cd "Invoice App v2.0"
  ```

  2. Install dependencies:
  ```bash
  npm install
  ```

  3. Set up environment variables (optional):
  ```bash
  cp env.example .env
  ```

  ## 🏃 Running the Application

  ### Development Mode
  ```bash
  npm run dev
  ```
  The app will be available at `http://localhost:5173`

  ### Production Build
  ```bash
  npm run build
  ```

  ### Preview Production Build
  ```bash
  npm run preview
  ```

  ## 👥 User Roles & Login

  Demo login signs in with **real Supabase users** seeded by
  `supabase/migrations/053_demo_users.sql`. Type the username on the login screen
  (the password field is ignored — the seeded credentials are used automatically).
  Apply migrations `052_vendor_onboarding.sql` and `053_demo_users.sql` to your
  Supabase project first, or demo login will report a sign-in error.

  ### Admin Access
  - Username: `Admin` (`admin@demo.local` / `Demo123!`)
  - Full system access including user management and calendar

  ### Manager Access
  - Username: `Manager` (`manager@demo.local` / `Demo123!`)
  - Team management and submission approval

  ### Contractor Access
  - Username: `Contractor` (`contractor@demo.local` / `Demo123!`)
  - Onboarding (work order upload + contract details + invoice numbering),
    submit hours, view submissions, and manage profile
  - Re-test onboarding anytime via `supabase/reset_demo_contractor.sql`

  ## 📁 Project Structure

  ```
  Invoice App v2.0/
  ├── src/
  │   ├── app/
  │   │   ├── components/      # React components
  │   │   │   ├── ui/          # Reusable UI components
  │   │   │   └── ...          # Feature components
  │   │   ├── data/            # Mock data
  │   │   ├── types/           # TypeScript types
  │   │   └── App.tsx          # Main app component
  │   ├── styles/              # CSS styles
  │   └── main.tsx             # App entry point
  ├── guidelines/              # Design guidelines
  ├── DEPLOYMENT.md            # Deployment guide
  └── package.json
  ```

  ## 🎨 Design

  This project is based on the Figma design available at:
  https://www.figma.com/design/InhSY9IMdMKuUyikIFHcsJ/Invoice-App-v2.0

  ## 🚢 Deployment

  For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

  Quick deploy options:
  - **Vercel**: `vercel --prod`
  - **Netlify**: `netlify deploy --prod`
  - **Docker**: See DEPLOYMENT.md for Docker configuration

  ## 🧪 Testing

  The app includes:
  - Error boundaries for production stability
  - Mock data for testing all features
  - Responsive design for mobile and desktop

  ## 📦 Tech Stack

  - **Framework**: React 18.3.1
  - **Language**: TypeScript
  - **Build Tool**: Vite 6.3.5
  - **Styling**: Tailwind CSS 4.1.12
  - **UI Components**: Radix UI
  - **Icons**: Lucide React
  - **Date Handling**: date-fns
  - **Notifications**: Sonner

  ## 🔧 Available Scripts

  - `npm run dev` - Start development server
  - `npm run build` - Build for production
  - `npm run preview` - Preview production build
  - `npm run type-check` - Check TypeScript types

  ## 🐛 Known Issues

  - Demo login uses seeded Supabase users (see User Roles & Login); the typed
    password is ignored in favor of the seeded credentials
  - Requires the SQL migrations to be applied to a configured Supabase project

  ## 📝 License

  See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for third-party licenses.

  ## 🤝 Contributing

  1. Fork the repository
  2. Create a feature branch
  3. Make your changes
  4. Test thoroughly
  5. Submit a pull request

  ## 📞 Support

  For issues or questions:
  1. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) guide
  2. Review the [Guidelines](./guidelines/Guidelines.md)
  3. Check the [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for dependencies
  