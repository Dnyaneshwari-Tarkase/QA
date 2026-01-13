import { GraduationCap } from 'lucide-react';

interface ExamLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function ExamLogo({ size = 'md', showText = true }: ExamLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const textClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-md" />
        <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-full p-2">
          <GraduationCap className={`${sizeClasses[size]} text-primary-foreground`} />
        </div>
      </div>
      {showText && (
        <span className={`${textClasses[size]} font-bold font-serif text-foreground`}>
          ExamPaper Pro
        </span>
      )}
    </div>
  );
}
