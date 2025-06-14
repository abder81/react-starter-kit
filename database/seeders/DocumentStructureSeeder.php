<?php

namespace Database\Seeders;

use App\Models\Folder;
use App\Models\Document;
use Illuminate\Database\Seeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class DocumentStructureSeeder extends Seeder
{ 
    private array $docTypes = [
        'Procédure',
        'Charte',
        'Guide',
        'Politique',
        'Enregistrement',
    ];

    private array $confidentialityLevels = [
        'Interne',
        'Public',
        'Restreint',
        'Confidentiel',
        'Strictement Confidentiel',
    ];

    private array $categories = [
        'Pilotage (4)'       => ['PSP-01', 'PSP-02', 'PSP-03: Piloter le SMQ et les connaissances', 'PSP-04'],
        'Réalisation (6)'    => ['PSR-05', 'PSR-06', 'PSR-07', 'PSR-09'],
        'Support (7)'        => ['PSS-11', 'PSS-13', 'PSS-15', 'PSS-17'],
    ];

    public function run(): void
    {
        // Create protected root folders
        $original = Folder::create([
            'name'           => 'Original',
            'full_path'      => 'Original',
            'parent_id'      => null,
            'level'          => 1,
            'type'           => 'root',
            'is_protected'   => true,
        ]);

        $obsolete = Folder::create([
            'name'           => 'Obsolete',
            'full_path'      => 'Obsolete',
            'parent_id'      => null,
            'level'          => 1,
            'type'           => 'root',
            'is_protected'   => true,
        ]);

        // Build out category → process → docType → confidentiality levels
        foreach (['Original' => $original, 'Obsolete' => $obsolete] as $rootName => $rootFolder) {
            foreach ($this->categories as $categoryName => $processes) {
                $category = Folder::create([
                    'name'           => $categoryName,
                    'full_path'      => "{$rootName}/{$categoryName}",
                    'parent_id'      => $rootFolder->id,
                    'level'          => 2,
                    'type'           => 'category',
                    'is_protected'   => true,
                ]);

                foreach ($processes as $processName) {
                    $process = Folder::create([
                        'name'           => $processName,
                        'full_path'      => "{$rootName}/{$categoryName}/{$processName}",
                        'parent_id'      => $category->id,
                        'level'          => 3,
                        'type'           => 'process',
                    ]);

                    foreach ($this->docTypes as $dt) {
                        $docTypeFolder = Folder::create([
                            'name'           => $dt,
                            'full_path'      => "{$rootName}/{$categoryName}/{$processName}/{$dt}",
                            'parent_id'      => $process->id,
                            'level'          => 4,
                            'type'           => 'document_type',
                        ]);

                        foreach ($this->confidentialityLevels as $level) {
                            $levelFolder = Folder::create([
                                'name'           => $level,
                                'full_path'      => "{$rootName}/{$categoryName}/{$processName}/{$dt}/{$level}",
                                'parent_id'      => $docTypeFolder->id,
                                'level'          => 5,
                                'type'           => 'confidentiality',
                            ]);

                            // Only seed documents under the “Original” tree
                            if ($rootName === 'Original') {
                                $this->createSampleDocuments($levelFolder);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Create some example PDF documents in a given folder.
     */
    private function createSampleDocuments(Folder $folder): void
    {
        $samples = [
            ['name' => 'Procedure_Qualite_v2.1.pdf', 'size' => 2_500_000],
            ['name' => 'Manuel_Formation.pdf',     'size' => 1_800_000],
            ['name' => 'Guide_Utilisateur.pdf',    'size' => 3_200_000],
            ['name' => 'Politique_Securite.pdf',  'size' => 1_100_000],
        ];

        foreach ($samples as $doc) {
            Document::create([
                'name'       => $doc['name'],
                'file_path'  => 'documents/' . $doc['name'],
                'full_path'  => $folder->full_path . '/' . $doc['name'],
                'folder_id'  => $folder->id,
                'mime_type'  => 'application/pdf',
                'size'       => $doc['size'],
            ]);
        }
    }
}


