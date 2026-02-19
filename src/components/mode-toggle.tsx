import { RiMoonFill, RiSunFill, RiContrastFill } from '@remixicon/react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon">
          <RiSunFill className={cn('size-5 rotate-0 transition-all scale-0', {
            'scale-100 rotate-90': theme === 'light',
          })} />
          <RiMoonFill className={cn('size-5 absolute rotate-90 scale-0 transition-all', {
            'scale-100 rotate-0': theme === 'dark',
          })} />
          <RiContrastFill className={cn('size-5 absolute rotate-90 scale-0 transition-all', {
            'scale-100 rotate-0': theme === 'system',
          })} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <RiContrastFill className="size-5 mr-2" />
          System
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <RiSunFill className="size-5 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <RiMoonFill className="size-5 mr-2" />
          Dark
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
