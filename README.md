# Inventory Management App

A cross-platform inventory management mobile app built with **Expo** and **Supabase**. Track equipment, manage checkouts, and stay on top of overdue returns—on iOS, Android, or web. This app mirrors the functionality of the [software-inventory-management](https://github.com/hyperlink/software-inventory-management) web app.

## What It Does

- **Track inventory** — Add items with photos, quantities, notes, and tags
- **Manage checkouts** — Check items in and out, set expected return dates
- **Monitor status** — Dashboard with active and overdue checkout counts
- **Get notified** — Push notifications for overdue returns and teammate checkouts
- **Search & browse** — Find items quickly across your inventory
- **Sync everywhere** — Shared Supabase backend keeps data in sync with the web app

## Features

| Feature | Description |
|--------|-------------|
| **Authentication** | Sign in with GitHub OAuth |
| **Dashboard** | Overview of inventory, active checkouts, and overdue counts |
| **Inventory** | Browse, search, add, edit, and delete items with tags and images |
| **Checkouts** | View and manage checkouts (yours, everyone's, returned) |
| **Item details** | Full item view, checkout, check-in, edit, or delete |
| **Push notifications** | Overdue reminders and team checkout alerts |
| **Settings** | Profile, theme (light/dark), and sign out |
| **Multi-platform** | iOS, Android, and web support |

## Prerequisites

- Node.js 18+
- npm or pnpm
- Expo CLI
- iOS Simulator, Android Emulator, or physical device
- A Supabase project with the same database schema as the web app

## Database Setup

This app uses the same Supabase database as the web application. Ensure your Supabase project has:

- **Tables**: `profiles`, `items`, `tags`, `itemtags`, `itemsignouts`, `push_tokens`
- **RPC functions**: `create_item`, `update_item`, `create_tag`, `checkout_item`, `checkin_item`, `delete_image_from_storage`, `delete_item`, `get_teammate_push_tokens`
- **Storage bucket**: `item-images` (public)

Refer to the source [software-inventory-management](https://github.com/hyperlink/software-inventory-management) project and the `supabase/migrations/` folder for the schema.

## Supabase Auth Configuration

### GitHub OAuth (required for sign-in to return to app)

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your app's redirect URL(s) to **Redirect URLs**:
   - **Expo Go** (auth proxy): `https://auth.expo.io/@<expo-username>/inventory-management-app`
     - Replace `<expo-username>` with your Expo account (e.g. `anonymous` when not logged in, or your username after `npx expo login`)
     - The exact URL is logged in the terminal when you tap Sign in—copy it from there
   - **Development build / Production**: `expoinvapp://auth/callback`
3. In **Authentication** → **Providers**, enable GitHub and add your OAuth credentials

**Important**: If the redirect URL is not in the allowlist, Supabase sends users to the web app (Site URL) instead of back to the native app.

### Testing in Expo Go

1. Run `npx expo start --ios` (or `--android` or `--web`)
2. Tap "Sign in with GitHub"
3. Check the terminal for `[Auth] Expo proxy redirect (add to Supabase):` and copy that URL
4. Add that URL to Supabase → Authentication → URL Configuration → Redirect URLs
5. Retry sign-in

**GitHub OAuth App** (configured in Supabase): The "Authorization callback URL" in your GitHub OAuth App settings is set by Supabase when you enable GitHub provider—use the Supabase callback URL from the Supabase dashboard, not the Expo proxy URL.

## Getting Started

1. **Clone and install**:
   ```bash
   cd inventory-management-app
   npm install
   # or: pnpm install
   ```

2. **Configure environment**: Create a `.env` file in the project root and add your Supabase URL and anon key:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Run the app**:
   ```bash
   npx expo start
   ```
   Then press `i` for iOS, `a` for Android, or `w` for web.

   Or run directly:
   ```bash
   npx expo start --ios
   npx expo start --android
   npx expo start --web
   ```

4. **Development builds** (native project):
   ```bash
   npx expo prebuild
   npx expo run:ios
   npx expo run:android
   ```

   **Running from Xcode without Metro** (e.g. `xed ios` then Run):
   - By default, Xcode uses the **Debug** scheme, which expects the Metro bundler. If Metro isn't running, you'll get a "request timed out" / "No script URL provided" error.
   - To run **without** Metro (bundle embedded in the app):
     1. In Xcode: **Product → Scheme → Edit Scheme…** (or ⌃⌘S).
     2. Select **Run** on the left.
     3. Set **Build Configuration** to **Release** (instead of Debug).
     4. Close and run with ▶️. The app will load the embedded JS bundle and won't need `expo start`.
   - Or from the terminal: `npx expo run:ios --configuration Release`

## Project Structure

```
├── app/                 # Expo Router screens
│   ├── (tabs)/          # Tab navigation (Home, Inventory, Checkouts, Add)
│   ├── item/[id].tsx    # Item detail screen
│   ├── login.tsx        # Login screen
│   ├── settings.tsx     # Settings
│   └── notifications.tsx
├── components/          # Reusable UI components
├── constants/           # Theme, colors
├── hooks/               # Auth context, theme colors
├── lib/                 # Supabase client, data fetching, actions, image upload
├── providers/           # Auth, add-item modal, data refresh, notifications
├── supabase/migrations/ # Database migrations
└── types/               # TypeScript types
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS |
| `npm run android` | Run on Android |
| `npm run web` | Run in web browser |
| `npm run ios:release` | Run iOS Release build |
| `npm run android:release` | Run Android Release build |

## License

Same as the parent project.
