import { Head, Link, router, usePage } from '@inertiajs/react';
import { PencilIcon, XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Utilisateurs', href: '/users' },
    { title: 'Modifier', href: '' },
];

interface PageProps {
    user: {
        id: number;
        name: string;
        email: string;
        service: string;
        is_admin: boolean;
    };
    services: string[];
    errors?: Record<string, string>;
    [key: string]: any;
}

export default function Edit() {
    const { user, services, errors = {} } = usePage<PageProps>().props;
    const [form, setForm] = useState({
        name: user.name || '',
        email: user.email || '',
        password: '',
        password_confirmation: '',
        service: user.service || '',
        is_admin: user.is_admin || false,
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setForm(f => ({
            ...f,
            [name]: type === 'checkbox'
                ? (e.target as HTMLInputElement).checked
                : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        router.post(`/users/${user.id}`, { ...form, _method: 'put' }, {
            onFinish: () => setLoading(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Modifier l'utilisateur" />
            
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-lg font-semibold text-white">
                                    {user.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div className="ml-4">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Modifier {user.name}
                            </h1>
                            <div className="flex items-center mt-1">
                                <p className="text-sm text-gray-600">{user.email}</p>
                                {user.is_admin && (
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        <ShieldCheckIcon className="w-3 h-3 mr-1" />
                                        Admin
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                    <form onSubmit={handleSubmit}>
                        <div className="px-6 py-6 space-y-6">
                            {/* Personal Information Section */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations personnelles</h3>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    {/* Name Field */}
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                            Nom complet <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            id="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 ${
                                                errors.name 
                                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                                    : 'border-gray-300'
                                            }`}
                                            placeholder="Entrez le nom complet"
                                            required
                                        />
                                        {errors.name && (
                                            <div className="mt-2 flex items-center text-sm text-red-600">
                                                <XMarkIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                                {errors.name}
                                            </div>
                                        )}
                                    </div>

                                    {/* Email Field */}
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                            Adresse email <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            id="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 ${
                                                errors.email 
                                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                                    : 'border-gray-300'
                                            }`}
                                            placeholder="exemple@domaine.com"
                                            required
                                        />
                                        {errors.email && (
                                            <div className="mt-2 flex items-center text-sm text-red-600">
                                                <XMarkIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                                {errors.email}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Security Section */}
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Modifier le mot de passe</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Laissez vide pour conserver le mot de passe actuel
                                </p>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    {/* Password Field */}
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                            Nouveau mot de passe
                                        </label>
                                        <input
                                            type="password"
                                            name="password"
                                            id="password"
                                            value={form.password}
                                            onChange={handleChange}
                                            className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 ${
                                                errors.password 
                                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                                    : 'border-gray-300'
                                            }`}
                                            placeholder="Minimum 8 caractères"
                                        />
                                        {errors.password && (
                                            <div className="mt-2 flex items-center text-sm text-red-600">
                                                <XMarkIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                                {errors.password}
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm Password Field */}
                                    <div>
                                        <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-2">
                                            Confirmer le nouveau mot de passe
                                        </label>
                                        <input
                                            type="password"
                                            name="password_confirmation"
                                            id="password_confirmation"
                                            value={form.password_confirmation}
                                            onChange={handleChange}
                                            className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 ${
                                                errors.password_confirmation 
                                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                                    : 'border-gray-300'
                                            }`}
                                            placeholder="Confirmer le mot de passe"
                                        />
                                        {errors.password_confirmation && (
                                            <div className="mt-2 flex items-center text-sm text-red-600">
                                                <XMarkIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                                {errors.password_confirmation}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Organization Section */}
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Organisation</h3>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    {/* Service Field */}
                                    <div>
                                        <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-2">
                                            Service
                                        </label>
                                        <select
                                            name="service"
                                            id="service"
                                            value={form.service}
                                            onChange={handleChange}
                                            className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 ${
                                                errors.service 
                                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                                    : 'border-gray-300'
                                            }`}
                                        >
                                            <option value="">Sélectionner un service</option>
                                            {services.map((service: string) => (
                                                <option key={service} value={service}>{service}</option>
                                            ))}
                                        </select>
                                        {errors.service && (
                                            <div className="mt-2 flex items-center text-sm text-red-600">
                                                <XMarkIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                                {errors.service}
                                            </div>
                                        )}
                                    </div>

                                    {/* Admin Checkbox */}
                                    <div className="flex items-center h-full">
                                        <div className="relative flex items-start">
                                            <div className="flex items-center h-5">
                                                <input
                                                    id="is_admin"
                                                    name="is_admin"
                                                    type="checkbox"
                                                    checked={form.is_admin}
                                                    onChange={handleChange}
                                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                                                />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="is_admin" className="font-medium text-gray-700">
                                                    Administrateur
                                                </label>
                                                <p className="text-gray-500">
                                                    Accès complet aux fonctionnalités d'administration
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3">
                            <Link 
                                href="/users" 
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                            >
                                Annuler
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                {loading ? (
                                    <>
                                        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                        </svg>
                                        Mise à jour...
                                    </>
                                ) : (
                                    <>
                                        <PencilIcon className="w-4 h-4 mr-2" />
                                        Mettre à jour
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}