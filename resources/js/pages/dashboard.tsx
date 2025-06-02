import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import FileManagerApp from '@/components/file-manager/App';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Documents',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    return (
        <FileManagerApp />
    );
}
