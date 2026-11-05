import { Router } from 'express';
import { ShelterVolunteerController } from './controller';

export const shelterVolunteerRouter = Router();

// Shelter endpoints
shelterVolunteerRouter.get('/shelters', ShelterVolunteerController.listShelters);
shelterVolunteerRouter.post('/shelters', ShelterVolunteerController.addShelter);
shelterVolunteerRouter.patch('/shelters/:id', ShelterVolunteerController.updateShelter);

// Legacy emergency paths for backward compatibility with frontend
shelterVolunteerRouter.get('/emergencies/shelters/list', ShelterVolunteerController.listShelters);
shelterVolunteerRouter.post('/emergencies/shelters/add', ShelterVolunteerController.addShelter);

// Volunteer endpoints
shelterVolunteerRouter.get('/volunteers', ShelterVolunteerController.listVolunteers);
shelterVolunteerRouter.patch('/volunteers/:id/assign', ShelterVolunteerController.assignVolunteer);

// Legacy emergency paths for backward compatibility with frontend
shelterVolunteerRouter.get('/emergencies/volunteers/list', ShelterVolunteerController.listVolunteers);
shelterVolunteerRouter.patch('/emergencies/volunteers/:id/assign', ShelterVolunteerController.assignVolunteer);
