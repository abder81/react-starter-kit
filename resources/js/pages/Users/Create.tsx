import { Head, Link, router, usePage } from '@inertiajs/react';
import { UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Utilisateurs', href: '/users' },
    { title: 'Créer', href: '/users/create' },
];

interface PageProps {
    services: string[];
    errors?: Record<string, string>;
    [key: string]: any;
}

export default function Create() {
    const { services, errors = {} } = usePage<PageProps>().props;
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        service: '',
        is_admin: false,
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
        router.post('/users', form, {
            onFinish: () => setLoading(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Créer un utilisateur" />
            
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <UserPlusIcon className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                        <div className="ml-4">
                            <h1 className="text-2xl font-bold text-gray-900">Créer un utilisateur</h1>
                            <p className="mt-1 text-sm text-gray-600">
                                Ajoutez un nouveau membre à votre équipe
                            </p>
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
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Sécurité</h3>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    {/* Password Field */}
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                            Mot de passe <span className="text-red-500">*</span>
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
                                            required
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
                                            Confirmer le mot de passe <span className="text-red-500">*</span>
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
                                            required
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
                                        Création...
                                    </>
                                ) : (
                                    <>
                                        <UserPlusIcon className="w-4 h-4 mr-2" />
                                        Créer l'utilisateur
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