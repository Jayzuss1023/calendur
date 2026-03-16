import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "../env";

if (!process.env.SANITY_API_TOKEN) {
  throw new Error("SANITY_API_TOKEN not set");
}

export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Set to false if statically generating pages, using ISR or tag-based revalidation
  token: process.env.SANITY_API_TOKEN,
});

if (!writeClient.config().token) {
  console.warn(
    "Warning: SANITY_API_TOKEN is not set. Write operations will fail.",
  );
}
