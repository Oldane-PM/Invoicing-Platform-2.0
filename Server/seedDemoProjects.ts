import { getSupabaseAdmin } from './clients/supabase.server';

async function seed() {
  const supabase = getSupabaseAdmin();

  const demoContractorId = '33333333-3333-3333-3333-333333333333';
  const demoManagerId = '22222222-2222-2222-2222-222222222222';

  const projects = [
    {
      name: 'Website Redesign',
      client: 'Acme Corp',
      description: 'Redesigning the main corporate website',
      start_date: '2026-01-01',
      manager_id: demoManagerId,
      is_enabled: true
    },
    {
      name: 'Mobile App V2',
      client: 'Global Tech',
      description: 'Building version 2 of the mobile app',
      start_date: '2026-02-15',
      manager_id: demoManagerId,
      is_enabled: true
    },
    {
      name: 'Backend API Migration',
      client: 'Initech',
      description: 'Migrating legacy APIs to microservices',
      start_date: '2026-03-01',
      manager_id: demoManagerId,
      is_enabled: true
    }
  ];

  console.log('Inserting projects...');
  for (const proj of projects) {
    const { data: projectData, error: projErr } = await supabase
      .from('projects')
      .insert(proj)
      .select('id')
      .single();

    if (projErr) {
      console.error('Error inserting project', proj.name, projErr);
      continue;
    }

    console.log(`Inserted project ${proj.name} with ID ${projectData.id}`);

    // Assign to demo contractor
    const { error: assignErr } = await supabase
      .from('project_assignments')
      .insert({
        project_id: projectData.id,
        contractor_id: demoContractorId
      });

    if (assignErr) {
      console.error('Error assigning project', proj.name, assignErr);
    } else {
      console.log(`Assigned project ${proj.name} to Demo Contractor`);
    }
  }

  console.log('Seeding complete!');
}

seed().catch(console.error);
