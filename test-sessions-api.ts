import fetch from "node-fetch";

async function testSessionsAPI() {
  const API_BASE = "http://localhost:4000";
  
  try {
    // Get list of classes
    const classesRes = await fetch(`${API_BASE}/api/registrations/classes`, {
      credentials: "include" as any,
    });
    
    if (!classesRes.ok) {
      throw new Error(`Failed to fetch classes: ${classesRes.statusText}`);
    }
    
    const classes = await classesRes.json();
    console.log(`Found ${classes.length} classes`);
    
    if (classes.length > 0) {
      const firstClass = classes[0];
      console.log(`\nTesting class: ${firstClass.name} (ID: ${firstClass.id})`);
      
      // Get class details with sessions
      const detailsRes = await fetch(
        `${API_BASE}/api/registrations/classes/${firstClass.id}`,
        {
          credentials: "include" as any,
        }
      );
      
      if (!detailsRes.ok) {
        throw new Error(`Failed to fetch class details: ${detailsRes.statusText}`);
      }
      
      const details = await detailsRes.json();
      console.log(`\nClass Details:`);
      console.log(`- Name: ${details.name}`);
      console.log(`- Type: ${details.classType}`);
      console.log(`- Price: $${details.price}`);
      console.log(`- Steps: ${details.steps?.length || 0}`);
      console.log(`- Sessions: ${details.sessions?.length || 0}`);
      
      if (details.sessions && details.sessions.length > 0) {
        console.log(`\nFirst 5 sessions:`);
        details.sessions.slice(0, 5).forEach((session: any, i: number) => {
          console.log(`  ${i + 1}. ${session.sessionDate.split('T')[0]} at ${session.startTime}`);
          console.log(`     Enrolled: ${session.currentEnrollment}/${session.maxStudents || details.maxStudents}`);
          console.log(`     Available: ${session.availableSpots} spots`);
          if (session.classStep) {
            console.log(`     Part ${session.classStep.stepNumber}: ${session.classStep.name}`);
          }
        });
      }
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

testSessionsAPI();
