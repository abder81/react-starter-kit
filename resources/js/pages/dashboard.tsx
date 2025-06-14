import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import FileManagerApp from '@/components/file-manager/App';
import React from 'react';
import { usePage } from '@inertiajs/react';
import { Node } from '@/components/file-manager/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Documents',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    // Move the usePage hook inside the component
    const { hierarchy } = usePage<{ hierarchy: Node[] }>().props;

    return (
        <AppLayout>
            <FileManagerApp initialHierarchy={hierarchy} />
        </AppLayout>
    );
}
