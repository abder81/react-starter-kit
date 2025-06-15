<?php

namespace Database\Seeders;

use App\Models\FolderConfiguration;
use Illuminate\Database\Seeder;

class FolderConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        $configurations = [
            [
                'key' => 'root_categories',
                'value' => ['Pilotage (4)', 'Réalisation (6)', 'Support (7)'],
                'description' => 'First level root categories'
            ],
            [
                'key' => 'document_types',
                'value' => ['Procédure', 'Charte', 'Guide', 'Politique', 'Enregistrement'],
                'description' => 'Document types for level 4 folders'
            ],
            [
                'key' => 'confidentiality_levels',
                'value' => ['Interne', 'Public', 'Restreint', 'Confidentiel', 'Strictement Confidentiel'],
                'description' => 'Confidentiality levels for level 5 folders'
            ]
        ];

        foreach ($configurations as $config) {
            FolderConfiguration::updateOrCreate(
                ['key' => $config['key']],
                $config
            );
        }
    }
} 