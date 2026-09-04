import { apiFetch } from "./api";
import type { User, UpdateProfileInput } from "@mini-project/shared-types";

export function getProfile(): Promise<User> {
  return apiFetch<User>("/users/me", { cache: "no-store" });
}

export function updateProfile(input: UpdateProfileInput): Promise<User> {
  return apiFetch<User>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function uploadAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append("avatar", file); // ชื่อ field ต้องตรงกับ FileInterceptor('avatar') ฝั่ง backend เป๊ะ ๆ
  return apiFetch<User>("/users/me/avatar", {
    method: "POST",
    body: formData,
  });
}
