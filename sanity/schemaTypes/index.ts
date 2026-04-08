import type { SchemaTypeDefinition } from "sanity";
import { availabilitySlotType } from "./availabilitySlotType";
import { bookingType } from "./bookingType";
import { connectedAccountType } from "./connectedAccountType";
import { feedbackType } from "./feedbackType";
import { meetingTypeType } from "./meetingTypeType";
import { userType } from "./userType";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    userType,
    availabilitySlotType,
    connectedAccountType,
    bookingType,
    meetingTypeType,
    feedbackType,
  ],
};
