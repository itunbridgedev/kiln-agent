async function test() {
  try {
    const response = await fetch('http://localhost:4000/api/registrations/classes/5');
    const data: any = await response.json();
    
    console.log(`Class: ${data.name}`);
    console.log(`Class Type: ${data.classType}`);
    console.log(`Requires Sequence: ${data.requiresSequence}`);
    console.log(`\nSessions returned: ${data.sessions.length}`);
    console.log('\nFirst 20 sessions:');
    
    data.sessions.slice(0, 20).forEach((s: any) => {
      const date = s.sessionDate.split('T')[0];
      const step = s.classStep ? `Part ${s.classStep.stepNumber}: ${s.classStep.name}` : 'No step';
      const pattern = s.schedulePattern ? `Pattern ${s.schedulePattern.id}` : 'No pattern';
      console.log(`  ${date} - ${step} (${pattern})`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
