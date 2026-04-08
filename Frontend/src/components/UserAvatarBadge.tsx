import { API_BASE_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type UserAvatarBadgeProps = {
  size?: "sm" | "md";
};

const normalizeImagePath = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  if (value.startsWith("http")) {
    return value;
  }

  return `${API_BASE_URL}/${value.replace(/^prisma\/?pictures\//, "pictures/")}`;
};

export function UserAvatarBadge({ size = "md" }: UserAvatarBadgeProps) {
  const { user } = useAuth();
  const imageSrc = normalizeImagePath(user?.profileImage);
  const initials = (
    user?.name?.trim().charAt(0) ||
    user?.email?.charAt(0) ||
    "U"
  ).toUpperCase();

  return (
    <div
      className={`user-avatar-badge user-avatar-badge--${size}`}
      title={user?.name || user?.email || "User"}
    >
      {imageSrc ? (
        <img src={imageSrc} alt={user?.name || "Profile"} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
