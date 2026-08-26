'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const teamMembers = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Sarah Johnson',
        position: 'Chief Executive Officer',
        description: 'Visionary leader with 15+ years in e-commerce and digital transformation',
        photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        order: 1,
        isActive: 1,
        createdBy: null,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Michael Chen',
        position: 'Chief Technology Officer',
        description: 'Full-stack developer passionate about scalable architecture and innovation',
        photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
        order: 2,
        isActive: 1,
        createdBy: null,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Emma Rodriguez',
        position: 'Head of Product',
        description: 'Product strategist focused on user experience and market fit',
        photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
        order: 3,
        isActive: 1,
        createdBy: null,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'David Martinez',
        position: 'Lead Backend Engineer',
        description: 'Database architect and performance optimization specialist',
        photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
        order: 4,
        isActive: 1,
        createdBy: null,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: 'Lisa Anderson',
        position: 'Head of Marketing',
        description: 'Digital marketing expert with proven track record in brand growth',
        photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
        order: 5,
        isActive: 1,
        createdBy: null,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        name: 'James Wilson',
        position: 'UI/UX Designer',
        description: 'Creative designer specializing in intuitive user interfaces and design systems',
        photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
        order: 6,
        isActive: 1,
        createdBy: null,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440007',
        name: 'Priya Patel',
        position: 'Customer Success Manager',
        description: 'Dedicated to building strong relationships and ensuring customer satisfaction',
        photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
        order: 7,
        isActive: 1,
        createdBy: null,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440008',
        name: 'Alex Thompson',
        position: 'DevOps Engineer',
        description: 'Infrastructure and deployment specialist ensuring system reliability',
        photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
        order: 8,
        isActive: 1,
        createdBy: null,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    try {
      return await queryInterface.sequelize.query(
        `INSERT INTO TeamMember (id, name, position, description, photo, \`order\`, isActive, createdBy, updatedBy, createdAt, updatedAt) VALUES 
        ${teamMembers.map(m =>
          `('${m.id}', '${m.name.replace(/'/g, "''")}', '${m.position.replace(/'/g, "''")}', '${m.description.replace(/'/g, "''")}', '${m.photo}', ${m.order}, ${m.isActive}, ${m.createdBy}, ${m.updatedBy}, '${m.createdAt}', '${m.updatedAt}')`
        ).join(', ')}`
      );
    } catch (error) {
      console.error('Seed error:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('TeamMember', null, {});
  },
};
