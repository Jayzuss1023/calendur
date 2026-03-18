import { google } from "googleapis";
import { writeClient } from "@/sanity/lib/writeClient";
import { client } from "@/sanity/lib/client";
import {
  USER_ID_BY_ACCOUNT_KEY_QUERY,
  type ConnectedAccountWithTokens,
} from "@/sanity/queries/user";

// OAuth2 client config
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

// Generate OAAuth URL for connecting a Google account
export function getGoogleAuthUrl(state: string) {
  const oauth2Client = createOAuth2Client();

  const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "select_account consent", // Force account picket and consent
    state,
  });
}

// Exhange authorization code for tokens
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Get Google user info (email, id, name)
export async function getGoogleUserInfo(accessToken: string) {
  const oauth2Client = await createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  console.log("RETREIVED DATA", data);

  if (!data.id || !data.email) {
    throw new Error("Failed to get user info from Google");
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
  };
}
