# Inventory Management App (Expo iOS)

A fully functional inventory management mobile app for iOS built with Expo and Supabase. This app mirrors the functionality of the [software-inventory-management](https://github.com/hyperlink/software-inventory-management) web app.

## Features

- **Authentication**: Sign in with GitHub OAuth
- **Dashboard**: Overview of inventory items and recent checkouts
- **Inventory**: Browse, search, add, edit, and delete items
- **Checkouts**: View and manage item checkouts (yours, everyone's, returned)
- **Item Details**: View full item details, checkout items, edit or delete
- **Check In**: Return checked-out items

## Prerequisites

- Node.js 18+
- npm or pnpm
- Expo CLI
- iOS Simulator or physical device
- A Supabase project with the same database schema as the web app

## Database Setup

This app uses the same Supabase database as the web application. Ensure your Supabase project has:

- **Tables**: `profiles`, `items`, `tags`, `itemtags`, `itemsignouts`
- **RPC functions**: `create_item`, `update_item`, `create_tag`, `checkout_item`, `checkin_item`, `delete_image_from_storage`
- **Storage bucket**: `item-images` (public)

Refer to the source [software-inventory-management](https://github.com/hyperlink/software-inventory-management) project for the full schema.

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

1. Run `npx expo start --ios` (or `--android`)
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
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Supabase URL and anon key:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Run on iOS**:
   ```bash
   npx expo start --ios
   ```

   Or for a development build:
   ```bash
   npx expo prebuild
   npx expo run:ios
   ```

## Project Structure

- `app/` - Expo Router screens
  - `(tabs)/` - Tab navigation (Dashboard, Inventory, Checkouts)
  - `item/[id].tsx` - Item detail screen
  - `login.tsx` - Login screen
- `components/` - Reusable UI components
- `lib/` - Supabase client, data fetching, actions
- `providers/` - Auth provider
- `hooks/` - Auth context

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |

## License

Same as the parent project.
