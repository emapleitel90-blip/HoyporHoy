import * as React from 'react';
import { cn } from '../../lib/utils';

// Native semantics preserve required validation, multi-select and form events.
const NativeSelect = React.forwardRef(({ className, ...props }, ref) => (
    <select ref={ref} className={cn('flex min-h-9 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
));
NativeSelect.displayName = 'NativeSelect';
export { NativeSelect };
