import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

export function UserDropdown() {
  const page = usePage<SharedData>();
  const { auth } = page.props;
  const getInitials = useInitials();

  return (
    <div className="">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full flex items-center gap-3 ">
            <Avatar className="size-8 overflow-hidden rounded-full">
              <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
              <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                {getInitials(auth.user.name)}
              </AvatarFallback>
            </Avatar>
            {/* <div className="flex-1 text-left">
              <p className="text-sm font-medium truncate">{auth.user.name}</p>
              <p className="text-xs text-gray-500 truncate">{auth.user.email}</p>
            </div> */}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <UserMenuContent user={auth.user} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}