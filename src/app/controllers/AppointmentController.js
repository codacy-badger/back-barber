import * as yup from 'yup';
import {startOfHour, parseISO, isBefore} from 'date-fns'

import User from '../models/User';
import Appointment from '../models/Appointment';
import { runInNewContext } from 'vm';

class AppointmentController {
    async index(req, res){
        const appointments = await Appointment.findAll({
            where:{user_id: req.userId, canceled_at: null},
            order:['date'],
            attributes:['id','date'],
            include:[
                {
                    model: User,
                    as:'provider',
                    attributes:['id','name'],
                    include: [
                        {
                            model: File,
                            as: 'avatar',
                            attributes: ['id', 'path', 'url']
                        }
                    ]
                }
            ]
        })
        return res.json(appointments);
    }
    async store(req, res){
        const schema = yup.object().shape({
            provider_id: yup.number().required(),
            data: yup.date().required(),
        });

        if (!(await schema.isValid(req.body))){
            return res.status(400).json({error:'Validation fails'})
        }

        const {provider_id,date}=req.body;

        const checkIsProvider = await User.findOne({
            where: { id: provider_id, provider: true},
        })

        if (!checkIsProvider){
            return res.status(401).json({error:'You can olny create appointments with providers'})
        }

        const hourStart = startOfHour(parseISO(date))
        if (isBefore(hourStart, new Date())){
            return res.status(400).json({error: 'Past dates are not permitted'})
        }

        const checkAvailability = await Appointment.findOne({
            where:{
                provider_id,
                canceled_at: null,
                date: hourStart
            }
        })

        if (checkAvailability){
            return res.status(400).json({error:'Appointment date is not available'})
        }

        const appointment = await Appointment.create({
            user_id: req.userId,
            provider_id,
            date,
        });

        return res.json(appointment);
    }
}

export default new AppointmentController()