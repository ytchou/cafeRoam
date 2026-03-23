import Link from 'next/link';

interface ProfileHeaderProps {
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  checkinCount: number;
  stampCount: number;
}

export function ProfileHeader({
  displayName,
  avatarUrl,
  email,
  checkinCount,
  stampCount,
}: ProfileHeaderProps) {
  const name = displayName || 'User';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="w-full bg-[#8B5E3C]">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
        {/* Left: Avatar + Info */}
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar URLs may come from OAuth providers
            <img
              src={avatarUrl}
              alt={name}
              className="h-16 w-16 rounded-full border-2 border-white/40 object-cover md:h-20 md:w-20"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/40 bg-[#F5EDE4] md:h-20 md:w-20">
              <span className="font-heading text-2xl font-bold text-[#8B5E3C] md:text-[28px]">
                {initial}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-[22px] font-bold text-white md:text-[26px]">
              {name}
            </h1>
            {email && (
              <p className="text-[13px] text-white/50">{email}</p>
            )}
            <Link
              href="/settings"
              className="text-[13px] font-medium text-white hover:underline"
            >
              Edit Profile &rarr;
            </Link>
          </div>
        </div>

        {/* Right: Stats Row */}
        <div className="flex items-center">
          <div className="flex flex-col items-center px-8">
            <span className="font-heading text-[28px] font-bold text-white md:text-[32px]">
              {checkinCount}
            </span>
            <span className="text-xs font-medium text-white/50">Check-ins</span>
          </div>
          <div className="h-12 w-px bg-white/30" />
          <div className="flex flex-col items-center px-8">
            <span className="font-heading text-[28px] font-bold text-white md:text-[32px]">
              {stampCount}
            </span>
            <span className="text-xs font-medium text-white/50">Memories</span>
          </div>
        </div>
      </div>
    </div>
  );
}
