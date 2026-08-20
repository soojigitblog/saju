import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mockStore } from "@/lib/mock-store";
import type { Tables, TablesInsert } from "@/types/database.types";

export type Profile = Tables<"profiles">;

export async function createAuthenticatedProfile(
  input: TablesInsert<"profiles"> & { user_id: string }
): Promise<Profile> {
  if (getDataMode() === "mock") {
    return persistMockProfile(input);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function createGuestProfile(
  input: TablesInsert<"profiles"> & { guest_session_id: string }
): Promise<Profile> {
  if (getDataMode() === "mock") {
    return persistMockProfile(input);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function createProfile(
  input: TablesInsert<"profiles">
): Promise<Profile> {
  if (input.user_id) {
    return createAuthenticatedProfile({ ...input, user_id: input.user_id });
  }
  if (!input.guest_session_id) {
    throw new Error("profiles require user_id or guest_session_id");
  }
  return createGuestProfile({
    ...input,
    guest_session_id: input.guest_session_id,
  });
}

export async function getProfileById(id: string): Promise<Profile | null> {
  if (getDataMode() === "mock") {
    return mockStore.profiles.get(id) ?? null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Reuse profile for same guest + canonical birth facts (nickname may update).
 */
export async function findGuestProfileByCanonicalInput(input: {
  guestSessionId: string;
  gender: string;
  birthDate: string;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  calendarType: string;
  birthPlace: string;
}): Promise<Profile | null> {
  if (getDataMode() === "mock") {
    for (const profile of mockStore.profiles.values()) {
      if (
        profile.guest_session_id === input.guestSessionId &&
        profile.gender === input.gender &&
        profile.birth_date === input.birthDate &&
        (profile.birth_time ?? null) === (input.birthTime ?? null) &&
        profile.birth_time_unknown === input.birthTimeUnknown &&
        profile.calendar_type === input.calendarType &&
        profile.birth_place === input.birthPlace
      ) {
        return profile;
      }
    }
    return null;
  }

  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("*")
    .eq("guest_session_id", input.guestSessionId)
    .eq("gender", input.gender as "male" | "female")
    .eq("birth_date", input.birthDate)
    .eq("birth_time_unknown", input.birthTimeUnknown)
    .eq("calendar_type", input.calendarType as "solar" | "lunar")
    .eq("birth_place", input.birthPlace)
    .order("created_at", { ascending: false })
    .limit(1);

  if (input.birthTime == null) {
    query = query.is("birth_time", null);
  } else {
    query = query.eq("birth_time", input.birthTime);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfileNickname(
  profileId: string,
  nickname: string
): Promise<Profile> {
  if (getDataMode() === "mock") {
    const existing = mockStore.profiles.get(profileId);
    if (!existing) throw new Error("Profile not found");
    const next = {
      ...existing,
      nickname,
      updated_at: new Date().toISOString(),
    };
    mockStore.profiles.set(profileId, next);
    return next;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ nickname })
    .eq("id", profileId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function attachProfileToUser(input: {
  profileId: string;
  userId: string;
}): Promise<Profile> {
  if (getDataMode() === "mock") {
    throw new Error("attachProfileToUser requires Supabase");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ user_id: input.userId })
    .eq("id", input.profileId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

function persistMockProfile(input: TablesInsert<"profiles">): Profile {
  const row: Profile = {
    id: crypto.randomUUID(),
    user_id: input.user_id ?? null,
    guest_session_id: input.guest_session_id ?? null,
    nickname: input.nickname,
    gender: input.gender,
    birth_date: input.birth_date,
    birth_time: input.birth_time ?? null,
    birth_time_unknown: input.birth_time_unknown ?? false,
    calendar_type: input.calendar_type,
    birth_place: input.birth_place,
    contact_email: input.contact_email ?? null,
    contact_phone: input.contact_phone ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockStore.profiles.set(row.id, row);
  return row;
}
