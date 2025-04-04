const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./src/db_config/db_config.js');
const cors = require('cors');
const cron = require('node-cron');
const moment = require('moment');
const e = require('express');

const app = express();
const multer = require('multer');
const path = require('path');


setInterval(() => {
    db.ping((err) => {
        if (err) console.error('Database Ping error:', err);
        else console.log('Database Ping successful');
    });
}, 27000000); 



// Set up storage for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Save the files in the 'uploads' directory
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        // Create a unique filename using the current timestamp
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Accept image files or PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);  // Accept the file
        } else {
            cb(new Error('Only images and PDFs are allowed'), false);  // Reject other file types
        }
    }
});


const nodemailer = require('nodemailer');
const { now } = require('moment/moment.js');
const { Console, log } = require('console');
const link=''
const transporter = nodemailer.createTransport({
    host: 'mail.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'leavesystem@gmail.com',
        pass:'Biso@2024$'
    },
    tls:{
        rejectUnauthorized:false
    }
})

function sendEmailNotifications(to, subject, text, link){

    const htmlContent = `
        <p>${text}</p>
        <p>Click <a href="${link}" target="_blank">here</a> to review the leave request.</p>
        <p>Best Regards,</p>
    `
    const mailOptions = {
        from:'leavesystem@gmail.com',
        to,
        subject,
        text,
        html: htmlContent
    }
    transporter.sendMail(mailOptions,(error, info) => {
        if(error){
            console.error('Error sending email: ', error)
        }else{
            console.log(`Email sent ; ${new Date().toLocaleString()}`);
            console.log(`   To: ${to}`);
            console.log(`   Subject: ${subject}`);
            console.log(`   Body: ${text}`)
        }
    })
}




// CONSTANTS
const mainLocationId = 1;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = 5000;

const jwt_secret = 'b01abafb275676041ad5c77c7117e31b165a2fd410b938c80a64c190fee0ff6e55791a4ae0eedd9e89b62b66ef1779f61e8086f09719d243d3c3fbfef4c77d23';


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


const camelToSnake = (obj) => {
    const newObj = {};
    Object.keys(obj).forEach((key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newObj[snakeKey] = obj[key];
    });
    return newObj;
};


function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
  
    if (token == null) return res.sendStatus(401)
  
    jwt.verify(token, jwt_secret, (err, user_details) => {
      if(err){
        console.log(err);
        return res.sendStatus(403);
      }

      req.user = user_details
  
      next()
    })
}




function getIdFromToken(req) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    var id = '';
  
    if (token == null) return res.sendStatus(401)
  
    jwt.verify(token, jwt_secret, (err, user_details) => {
  
      if (err) return res.sendStatus(403)

      id = user_details.id

    })

    return id;
}

function hrAuthenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
  
    if (token == null) return res.sendStatus(401)
  
    jwt.verify(token, jwt_secret, (err, user_details) => {
  
      if (err || !user_details.is_hr) {
        console.log(err)
        return res.sendStatus(403);
    }

      req.user = user_details
  
      next()
    })
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const roundLeaveDays = (days) => {
    const decimalPart = days - Math.floor(days);
    let roundedDays = Math.floor(days);
    if (decimalPart >= 0.75) {
        roundedDays = Math.ceil(days);
    } else if (decimalPart > 0.25 && decimalPart < 0.75) {
        roundedDays = Math.floor(days) + 0.5;
    }
    return roundedDays;
};

const isManager = (employeeId) => {
    return new Promise((resolve, reject) => {
        const checkManagerQuery = `
            SELECT COUNT(*) AS isManager
            FROM employee
            WHERE manager_id = ?
        `;
        db.query(checkManagerQuery, [employeeId], (err, results) => {
            if (err) {
                console.error('Error checking if employee is a manager:', err);
                return reject(err);
            }
            resolve(results[0].isManager > 0);
        });
    });
};

//Calculating leave days of employees who are added 
const calculateLeaveDaysForPartialYear = (startDate, endDate, isManager) => {
    const startMoment = moment(startDate, 'YYYY-MM-DD');
    const leaveDaysPerYear = isManager ? 21 : 15;
    const leaveDaysPerMonth = leaveDaysPerYear / 12;

    let totalLeaveDays = 0;

    // Calculate the prorated leave days for the start month
    const daysInStartMonth = startMoment.daysInMonth();
    const startMonthFraction = (daysInStartMonth - startMoment.date() + 1) / daysInStartMonth;
    totalLeaveDays += startMonthFraction * leaveDaysPerMonth;

    // If an end date is provided and it falls within the same year, calculate for the end month
    if (endDate) {
        const endMoment = moment(endDate, 'YYYY-MM-DD');

        // If the end date is within the same year as the start date
        if (endMoment.year() === startMoment.year()) {
            const daysInEndMonth = endMoment.daysInMonth();
            const endMonthFraction = endMoment.date() / daysInEndMonth;
            totalLeaveDays += endMonthFraction * leaveDaysPerMonth;


            // Add leave days for full months between start and end dates
            const fullMonthsBetween = endMoment.diff(startMoment, 'months') - 1;
            totalLeaveDays += fullMonthsBetween * leaveDaysPerMonth;
        }
    } else {
        // If no end date is provided or it's in the next year, calculate for the full months remaining in the year
        const fullMonthsLeft = 11 - startMoment.month();
        totalLeaveDays += fullMonthsLeft * leaveDaysPerMonth;
    }

    return roundLeaveDays(totalLeaveDays);
};


const calculateLeaveDaysPerYear = (yearsOfService, isManager) => {
    if (isManager) {
        return 21;
    } else if (yearsOfService >= 15) {
        return 21;
    } else if (yearsOfService >= 5) {
        return 18;
    } else {
        return 15;
    }
};

const setLeaveDaysOnPromotion = (employeeId, promotionDate) => {
    return new Promise(async (resolve, reject) => {
        const getEmployeeQuery = `SELECT start_date, days, first_name, last_name FROM employee WHERE id = ?`;

        db.query(getEmployeeQuery, [employeeId], async (err, results) => {
            if (err) {
                console.error('Error fetching employee details:', err);
                return reject(err);
            }

            const { start_date: startDate, days: currentDays, first_nme: firstName, last_name: lastName } = results[0];

            const promotionMoment = moment(promotionDate);
            const startMoment = moment(startDate);
            const yearsOfService = promotionMoment.diff(startMoment, 'years');

            // Check if the employee is a manager
            const isManagerStatus = await isManager(employeeId);

            // Same day promotion check
            var isSameDay = false;
            let roundedAdjustedDays;

            // Determine leave days per year
            const initialLeaveDaysPerYear = calculateLeaveDaysPerYear(yearsOfService, isManagerStatus);

            // Calculate the initial prorated days added at the start
            let initialProratedDaysAdded;
            if (startMoment.year() === promotionMoment.year()) {
                if ((startMoment.month() === promotionMoment.month()) && (startMoment.date() === promotionMoment.date())) {
                    // Employee started on the promotion date
                    const daysInStartMonth = startMoment.daysInMonth();
                    const startMonthDaysFraction = (daysInStartMonth - startMoment.date() + 1) / daysInStartMonth;
                    const monthsLeftTillEndOfYear = 11 - startMoment.month();
                    const adjustedDays = (21 / 12) * (startMonthDaysFraction + monthsLeftTillEndOfYear);

                    roundedAdjustedDays = roundLeaveDays(adjustedDays);

                    isSameDay = true;
                } else {
                    // Employee started earlier in the year
                    const daysInStartMonth = startMoment.daysInMonth();
                    const startMonthDaysFraction = (daysInStartMonth - startMoment.date() + 1) / daysInStartMonth;
                    const monthsLeftTillEndOfYear = 11 - startMoment.month();

                    const monthsAsEmployee = startMonthDaysFraction + monthsLeftTillEndOfYear;
                    initialProratedDaysAdded = (15 / 12) * monthsAsEmployee;
                }
            } else {
                // Employee started in a previous year, so full year days were added at the start of the year
                initialProratedDaysAdded = initialLeaveDaysPerYear;
            }

            if (isSameDay) {
                const updateQuery = `UPDATE employee SET days = ? WHERE id = ?`;
                db.query(updateQuery, [roundedAdjustedDays, employeeId], (err, result) => {
                    if (err) {
                        console.error('Error updating leave days:', err);
                        return reject(err);
                    }
                    console.log(`Leave days updated for employee ID ${employeeId}: ${roundedAdjustedDays}`);
                    resolve(result);
                });
            } else if(startMoment.year() === promotionMoment.year() && !isSameDay){
                console.log(`Initial Prorated Days Added: ${initialProratedDaysAdded}`);

                // Calculate prorated days before promotion
                const daysInStartMonth = startMoment.daysInMonth();
                const startMonthDaysFraction = (daysInStartMonth - startMoment.date() + 1) / daysInStartMonth;
                const monthsLeftTillPromotion = promotionMoment.month() - startMoment.month() - 1;
                const promotionMonthDaysFraction = promotionMoment.date() / promotionMoment.daysInMonth();

                const monthsAsEmployee = startMonthDaysFraction + monthsLeftTillPromotion + promotionMonthDaysFraction;
                const proratedDaysAsEmployee = (15 / 12) * monthsAsEmployee;

                console.log(`Months as Employee: ${monthsAsEmployee}`);
                console.log(`Prorated Days as Employee: ${proratedDaysAsEmployee}`);

                // Calculate prorated days after promotion as manager
                const daysInPromotionMonth = promotionMoment.daysInMonth();
                const promotionMonthDaysFractionAfter = (daysInPromotionMonth - promotionMoment.date() + 1) / daysInPromotionMonth;
                const fullMonthsBetweenPromotionAndEndOfYear = 11 - promotionMoment.month();

                const monthsAsManager = promotionMonthDaysFractionAfter + fullMonthsBetweenPromotionAndEndOfYear;
                const proratedDaysAsManager = (21 / 12) * monthsAsManager;

                console.log(`Months as Manager: ${monthsAsManager}`);
                console.log(`Prorated Days as Manager: ${proratedDaysAsManager}`);

                // Calculate total new prorated days
                const totalProratedDays = proratedDaysAsEmployee + proratedDaysAsManager;

                // Adjust current leave days
                let adjustedDays = currentDays - roundLeaveDays(initialProratedDaysAdded) + totalProratedDays;

                roundedAdjustedDays = roundLeaveDays(adjustedDays);

                console.log(`Rounded Adjusted Days: ${roundedAdjustedDays}`);

                const updateQuery = `UPDATE employee SET days = ? WHERE id = ?`;
                db.query(updateQuery, [roundedAdjustedDays, employeeId], (err, result) => {
                    if (err) {
                        console.error('Error updating leave days:', err);
                        return reject(err);
                    }
                    const subject = 'Promotion Update'
                    const text = `Dear HR,\n\nThe days of ${firstName} ${lastName} with id ${employeeId} have been updated from ${currentDays} to ${roundedAdjustedDays}.\n\nBest regards`
                    const link = `http://custom-application:3000/login`
                    sendEmailNotifications('leaverequest@gmail.com',subject, text, link)
                    console.log(`Leave days updated for employee ID ${employeeId}: ${roundedAdjustedDays}`);
                    resolve(result);
                });
            }else if(startMoment.year() !== promotionMoment.year() && !isSameDay && initialProratedDaysAdded!==21){
                console.log(`Initial Prorated Days Added: ${initialProratedDaysAdded}`);

                // Calculate prorated days before promotion
                const monthsLeftTillPromotion = promotionMoment.month();
                
                const promotionMonthDaysFraction = promotionMoment.date() / promotionMoment.daysInMonth();

                const monthsAsEmployee = monthsLeftTillPromotion + promotionMonthDaysFraction;
                const proratedDaysAsEmployee = (initialProratedDaysAdded / 12) * monthsAsEmployee;

                console.log(`Months as Employee: ${monthsAsEmployee}`);
                console.log(`Prorated Days as Employee: ${proratedDaysAsEmployee}`);

                                // Calculate prorated days after promotion as manager
                const daysInPromotionMonth = promotionMoment.daysInMonth();
                const promotionMonthDaysFractionAfter = (daysInPromotionMonth - promotionMoment.date() + 1) / daysInPromotionMonth;
                const fullMonthsBetweenPromotionAndEndOfYear = 11 - promotionMoment.month();

                const monthsAsManager = promotionMonthDaysFractionAfter + fullMonthsBetweenPromotionAndEndOfYear;
                const proratedDaysAsManager = (21 / 12) * monthsAsManager;
                console.log("full months between promotion and year: "+fullMonthsBetweenPromotionAndEndOfYear)
                console.log(`Months as Manager: ${monthsAsManager}`);
                console.log(`Prorated Days as Manager: ${proratedDaysAsManager}`);
                                // Calculate total new prorated days
                const totalProratedDays = proratedDaysAsEmployee + proratedDaysAsManager;

                // Adjust current leave days
                let adjustedDays = currentDays - roundLeaveDays(initialProratedDaysAdded) + totalProratedDays;

                roundedAdjustedDays = roundLeaveDays(adjustedDays);


                const updateQuery = `UPDATE employee SET days = ? WHERE id = ?`;
                db.query(updateQuery, [roundedAdjustedDays, employeeId], (err, result) => {
                    if (err) {
                        console.error('Error updating leave days:', err);
                        return reject(err);
                    }
                    const subject = 'Promotion Update'
                    const text = `Dear HR,\n\nThe days of ${firstName} ${lastName} with id ${employeeId} have been updated from ${currentDays} to ${roundedAdjustedDays}.\n\nBest regards`
                    const link = `http://custom-application:3000/login`
                    sendEmailNotifications('leaverequest@gmail.com',subject, text, link)
                    console.log(`Leave days updated for employee ID ${employeeId}: ${roundedAdjustedDays}`);
                    resolve(result);
                });

            }
        });
    });
};

const adjustLeaveDaysOnServiceAnniversary = (employeeId, adjustmentDate) => {
    return new Promise((resolve, reject) => {
        const checkIfManagerQuery = `SELECT * FROM employee WHERE manager_id = ?`;

        db.query(checkIfManagerQuery, [employeeId], (err, results) => {
            if (err) {
                console.error('Error checking if employee is a manager:', err);
                return reject(err);
            }
        
            if (results && results.length !== 0) {
                return resolve(); // Employee is a manager; no further processing needed
            }
        })

        const getEmployeeQuery = `SELECT first_name, last_name, start_date, days FROM employee WHERE id = ?`;
        db.query(getEmployeeQuery, [employeeId], (err, results) => {
            if (err) {
                console.error('Error fetching employee details:', err);
                return reject(err);
            }

            const { first_name: firstName, last_name: lastName, start_date: startDate, days: currentDays } = results[0];

            const adjustmentMoment = moment(adjustmentDate);
            const startMoment = moment(startDate);

            let yearsOfService = adjustmentMoment.diff(startMoment, 'years');

            // Adjust yearsOfService if today is the anniversary date
            if (adjustmentMoment.month() === startMoment.month() && adjustmentMoment.date() === startMoment.date()) {
                yearsOfService += 1;
            }


            const daysInServiceChangeMonth = adjustmentMoment.daysInMonth();
            const serviceChangeMonthDaysFractionBefore = (adjustmentMoment.date()) / daysInServiceChangeMonth;
            const monthsBeforeServiceChange = adjustmentMoment.month();
            const monthsAfterServiceChange = 11 - monthsBeforeServiceChange;
            const serviceChangenMonthDaysFractionAfter = (daysInServiceChangeMonth - adjustmentMoment.date() + 1) / daysInServiceChangeMonth;


            let leaveDaysBeforeAdjustment, leaveDaysAfterAdjustment;

            if (yearsOfService === 5) {
                leaveDaysBeforeAdjustment = 15;
                leaveDaysAfterAdjustment = 18;
            } else if (yearsOfService === 15) {
                leaveDaysBeforeAdjustment = 18;
                leaveDaysAfterAdjustment = 21;
            } else {
                console.log(`No adjustment needed for employee ID: ${employeeId} - not hitting 5 or 15 years milestone`);
                return resolve(); // No adjustment needed if not hitting 5 or 15 years milestone
            }

            const leaveDaysAccruedBeforeAdjustment = (leaveDaysBeforeAdjustment / 12) * (monthsBeforeServiceChange + serviceChangeMonthDaysFractionBefore);
            const leaveDaysAccruedAfterAdjustment = (leaveDaysAfterAdjustment / 12) * (monthsAfterServiceChange + serviceChangenMonthDaysFractionAfter);

            // Calculate days added at the start of the year
            const initialProratedDaysAdded = yearsOfService === 5 ? 15 : 18;


            let newLeaveDays = currentDays - initialProratedDaysAdded + leaveDaysAccruedBeforeAdjustment + leaveDaysAccruedAfterAdjustment;

            const roundedNewLeaveDays = roundLeaveDays(newLeaveDays);


            const logQuery=`
                INSERT INTO leave_balance_log (employee_id, balance_before, balance_after, log_date) VALUES (?, ?, ?, ?)
            `

            const updateQuery = `UPDATE employee SET days = ? WHERE id = ?`;

            db.query(logQuery, [employeeId, currentDays, roundedNewLeaveDays, new Date()], (logErr)=>{
                if(logErr){
                    console.error(`Error logging balance for Employee ID ${employeeId}:`, logErr)
                    return reject(logErr)
                }
                db.query(updateQuery, [roundedNewLeaveDays, employeeId], (err, result) => {
                    if (err) {
                        console.error('Error updating leave days:', err);
                        return reject(err);
                    }
                    const employeeName = `${firstName} ${lastName}`
    
                    const subject = 'Anniversary Update'
                    const text = `Dear HR,\n\nThe days of ${employeeName} with id ${employeeId} have been updated from ${currentDays} to ${roundedNewLeaveDays}.\n\nBest regards`
                    const link = `http://custom-application:3000/login`
                    sendEmailNotifications('leaverequest@gmail.com',subject, text, link)
                    console.log(`Leave days updated for employee ID: ${employeeId}`);
    
                    resolve(result);
                });
            })
        });
    });
};
const calculateLeaveDays = (startDate, endDate, isManager, yearsOfService) => {
    const startMoment = moment(startDate, 'YYYY-MM-DD');
    const currentYear = moment().year();
    const leaveDaysPerYear = isManager ? 21 : (yearsOfService >= 15 ? 21 : (yearsOfService >= 5 ? 18 : 15));
    const leaveDaysPerMonth = leaveDaysPerYear / 12;

    // console.log(`Calculating leave days...`);
    // console.log(`Start Date: ${startDate}`);
    // console.log(`End Date: ${endDate ? endDate : 'N/A'}`);
    // console.log(`Is Manager: ${isManager}`);
    // console.log(`Years of Service: ${yearsOfService}`);
    // console.log(`Leave Days Per Year: ${leaveDaysPerYear}`);
    // console.log(`Leave Days Per Month: ${leaveDaysPerMonth}`);

    let totalLeaveDays = 0;

    if (endDate && moment(endDate).year() === currentYear) {
        // The employee is ending within the current year

        const endMoment = moment(endDate, 'YYYY-MM-DD');
        const daysInEndMonth = endMoment.daysInMonth();

        // Calculate months between Jan 1 and the end month (excluding end month)
        const fullMonthsBeforeEnd = endMoment.month(); // January is month 0, so this counts correctly

        // Calculate fraction of the end month worked
        const endMonthFraction = endMoment.date() / daysInEndMonth;

        // Total leave days: full months + partial end month
        totalLeaveDays = (fullMonthsBeforeEnd + endMonthFraction) * leaveDaysPerMonth;

        // console.log(`End Date is within the current year.`);
        // console.log(`End Month: ${endMoment.format('MMMM')}`);
        // console.log(`Full Months Before End: ${fullMonthsBeforeEnd}`);
        // console.log(`End Month Fraction: ${endMonthFraction}`);
        // console.log(`Leave Days for Partial Year: ${totalLeaveDays}`);
    } else {
        // No end date provided or end date is outside the current year
        // Full 12 months of leave

        totalLeaveDays = leaveDaysPerMonth * 12;

        // console.log(`No End Date or End Date is beyond the current year.`);
        // console.log(`Leave Days for Full Year: ${totalLeaveDays}`);
    }

    // console.log(`Total Leave Days before rounding: ${totalLeaveDays}`);
    const roundedLeaveDays = roundLeaveDays(totalLeaveDays);
    // console.log(`Rounded Leave Days: ${roundedLeaveDays}`);

    return roundedLeaveDays;
};

const updateLeaveDaysOnJan1 = () => {
    return new Promise((resolve, reject) => {
        const currentYear = moment().year();
        const getEmployeesQuery = `
            SELECT id, start_date, end_date 
            FROM employee
        `;

        db.query(getEmployeesQuery, (err, employees) => {
            if (err) {
                console.error('Error fetching employees:', err);
                return reject(err);
            }

            const updatePromises = employees.map(employee => {
                const { id, start_date, end_date } = employee;
                const startMoment = moment(start_date);
                const yearsOfService = currentYear - startMoment.year();

                return isManager(id).then(isManager => {
                    let leaveDays;

                    if (end_date && moment(end_date).year() === currentYear) {
                        // Prorate leave days if the end date is within the current year
                        leaveDays = calculateLeaveDays(start_date, end_date, isManager, yearsOfService, 0, 12);
                    } else {
                        // Full leave days if no end date or end date is outside the current year
                        leaveDays = calculateLeaveDays(start_date, null, isManager, yearsOfService, 0, 12);
                    }
                    const newBalance = currentDays +leaveDays
                    const logQuery=`
                        INSERT INTO leave_balance_log (employee_id, balance_before, balance_after, log_date) VALUES (?,?,?,?)
                    `
                    const updateQuery = `UPDATE employee SET days = days + ? WHERE id = ?`;
                    return db.query(logQuery, [id, currentDays, newBalance, new Date()]), (logErr) => {
                        if(logErr){
                            console.err(`Error logging balance for employee with id ${id}:`, logErr)
                            throw logErr
                        }
                        db.query(updateQuery, [leaveDays, id], (updateErr) =>{
                            if(updateErr){
                                console.err(`Error updating balance for employee with id ${id}:`, updateErr)
                                throw updateErr
                            }
                        });
                    }
                
                });
            });

            Promise.all(updatePromises)
                .then(results => {
                    console.log('Leave days updated successfully for all employees');
                    resolve(results);
                })
                .catch(err => {
                    console.error('Error updating leave days:', err);
                    reject(err);
                });
        });
    });
};



// Schedule the updateLeaveDaysOnJan1 
cron.schedule('0 0 1 1 *', () => {
    console.log('Starting leave days update at 00:00 AM 1st of January...');
    updateLeaveDaysOnJan1()
        .then(() => {
            console.log('Leave days updated for all employees');
        })
        .catch(err => {
            console.error('Error running the leave update:', err);
        });
});

const checkAndAdjustServiceAnniversaries = () => {
    return new Promise((resolve, reject) => {
        const currentDate = moment().format('MM-DD');
        console.log(`Current Date for Anniversary Check: ${currentDate}`);

        const getEmployeesQuery = `
            SELECT id, start_date, first_name, last_name, days 
            FROM employee 
            WHERE DATE_FORMAT(start_date, '%m-%d') = ?
        `;
        
        db.query(getEmployeesQuery, [currentDate], (err, employees) => {
            if (err) {
                console.error('Error fetching employees:', err);
                return reject(err);
            }

            console.log(`Employees with service anniversary today: ${employees.length}`);
            employees.forEach(employee => {
                console.log(`Employee ID: ${employee.id}, Start Date: ${employee.start_date}`);
            });

            const adjustmentPromises = employees.map(employee => {
                return adjustLeaveDaysOnServiceAnniversary(employee.id, moment().format('YYYY-MM-DD'))
                    .then(() => {
                        console.log(`Leave days adjusted for employee ID: ${employee.id}`);
                    })
                    .catch(err => {
                        console.error(`Error adjusting leave days for employee ID: ${employee.id}`, err);
                    });
            });

            Promise.all(adjustmentPromises)
                .then(results => {
                    resolve(results);
                })
                .catch(err => {
                    console.error('Error adjusting leave days:', err);
                    reject(err);
                });
        });
    });
};




// Schedule the checkAndAdjustServiceAnniversaries function to run daily 
cron.schedule('00 00 * * *', () => {
    console.log('Starting daily service anniversary check at 00:00 AM...');
    checkAndAdjustServiceAnniversaries()
        .then(() => {
            console.log('Service anniversary check completed');
        })
        .catch(err => {
            console.error('Error running the service anniversary check:', err);
        });
});


app.get('/employee', hrAuthenticateToken, (req, res) => {
    var query = `
                SELECT 
                e.id, 
                e.first_name,
                e.last_name,   
                e.email, 
                e.days,
                d.name AS "department_name", 
                e.manager_id, 
                CONCAT(me.first_name, ' ', me.last_name) AS manager_full_name,  
                e.birthday, 
                e.start_date, 
                e.end_date, 
                l.location_name,
                e.first_approver_id,
                CONCAT(fe.first_name, ' ', fe.last_name) AS first_approver_full_name,
                COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Annual Paid Leave')) THEN ld.duration ELSE 0 END), 0) AS paid_leaves_taken,
                COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Sick Leave With Medical Report')) THEN ld.duration ELSE 0 END), 0) AS sick_leaves_with_medical_report_taken,
                COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Sick Leave Allowed')) THEN ld.duration ELSE 0 END), 0) AS sick_leaves_allowed_taken,
                COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Compassionate')) THEN ld.duration ELSE 0 END), 0) AS compassionate_taken,
                COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Unpaid Leave')) THEN ld.duration ELSE 0 END), 0) AS unpaid_leave_taken,
                COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Marital')) THEN ld.duration ELSE 0 END), 0) AS marital_taken,
                COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Maternity')) THEN ld.duration ELSE 0 END), 0) AS maternity_taken,
                COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Paternity')) THEN ld.duration ELSE 0 END), 0) AS paternity_taken
                FROM employee e
                LEFT JOIN department d ON e.department_id = d.id
                LEFT JOIN employee me ON e.manager_id = me.id
                LEFT JOIN employee fe ON e.first_approver_id = fe.id
                LEFT JOIN location l ON e.location_id = l.id
                LEFT JOIN leave_requests lr ON e.id = lr.employee_id
                LEFT JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
                GROUP BY e.id
    `;
    db.query(query, async (err, result) => {
        if (err) res.send(err);
        else{
            const employeesWithLeaveDays = await Promise.all(result.map(async (employee) => {
                const leaveDaysOnJan1 = await calculateLeaveDaysForEmployeeOnJan1(employee)

                return{
                    ...employee, leave_days_on_jan_1: leaveDaysOnJan1
                }
            }))
            res.send(employeesWithLeaveDays)
        };
    });
});

app.get('/bank-employees', (req, res) => {
    var query = `SELECT 
                    b.id,
                    b.first_name_en,
                    b.last_name_en,
                    b.first_name_ar,
                    b.last_name_ar,
                    b.date_of_birth,
                    r.relation AS relation,
                    b.related_to, 
                    b.nssf_no, 
                    b.bank_pin, 
                    b.company_id,
                    b.location,
                    c.company_name,
                    l.location AS branch_location,
                    CONCAT(rs.first_name_en,' ', rs.last_name_en) AS related_to_full_name
                FROM 
                    bank_staff b
                JOIN 
                    bank_company c ON b.company_id = c.id
                JOIN 
                    bank_location l ON b.location = l.id
                LEFT JOIN 
                    bank_staff rs ON b.related_to = rs.id
                LEFT JOIN 
                    bank_relation r ON b.relation_id = r.id;
                
                `;
    db.query(query, async (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send({ error: "Failed to fetch bank employees" });
        } else {
            res.status(200).json(results); // Send results as JSON
        }
    })
});

app.get('/pure-bank-employees', (req, res) => {
    var query = `SELECT 
                    b.id,
                    b.first_name_en,
                    b.last_name_en,
                    b.first_name_ar,
                    b.last_name_ar,
                    b.date_of_birth,
                    r.relation AS relation,
                    b.related_to, 
                    b.nssf_no, 
                    b.location AS location_id,
                    b.company_id AS company_id,
                    b.bank_pin, 
                    c.company_name,
                    l.location AS branch_location,
                    CONCAT(rs.first_name_en,' ', rs.last_name_en) AS related_to_full_name
                FROM 
                    bank_staff b
                JOIN 
                    bank_company c ON b.company_id = c.id
                JOIN 
                    bank_location l ON b.location = l.id
                LEFT JOIN 
                    bank_staff rs ON b.related_to = rs.id
                LEFT JOIN 
                    bank_relation r ON b.relation_id = r.id
                WHERE b.relation_id = '6';
                
                `;
    db.query(query, async (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send({ error: "Failed to fetch bank employees" });
        } else {
            res.status(200).json(results); // Send results as JSON
        }
    })
});


async function calculateLeaveDaysForEmployeeOnJan1(employee){
    const {id, start_date, end_date } = employee
    const currentYear = moment().year()
    const startMoment = moment(start_date, 'YYYY-MM-DD')
    const endMoment = end_date ? moment(end_date, 'YYYY-MM-DD') : null

    const isManagerStatus = await isManager(id)

    const yearsOfService = currentYear - startMoment.year()

    if(endMoment && endMoment.year() === currentYear){
        return calculateLeaveDays(start_date, end_date, isManagerStatus, yearsOfService)
    }else{
        return calculateLeaveDays(start_date, null, isManagerStatus, yearsOfService)
    }
}
app.get('/employee/:id',async  (req, res) => {
    const id = req.params.id;
    const query = `
        SELECT 
            e.id, 
            e.first_name, 
            e.middle_name, 
            e.last_name, 
            e.email, 
            e.days, 
            d.id AS "department_id", 
            d.name AS "department_name", 
            e.previous_depID,
            prev_d.name AS "previous_department_name",
            e.manager_id, 
            CONCAT(me.first_name, ' ', me.last_name) AS manager_full_name,  
            e.birthday, 
            e.start_date, 
            e.end_date,
            EXISTS(
                SELECT COUNT(*) FROM employee WHERE manager_id = e.id HAVING COUNT(*) > 0
            ) AS is_manager,
            l.location_name,
            e.first_approver_id, 
            CONCAT(fe.first_name, ' ', fe.last_name) AS first_approver_full_name, 
            e.disable_reason
        FROM employee e
        LEFT JOIN department d ON e.department_id = d.id
        LEFT JOIN department prev_d ON e.previous_depID = prev_d.id 
        LEFT JOIN employee me ON e.manager_id = me.id
        LEFT JOIN employee fe ON e.first_approver_id = fe.id
        LEFT JOIN location l ON e.location_id = l.id
        WHERE e.id = ?;
    `;
    try{
        const employeeResult = await new Promise((resolve, reject) => {
            db.query(query, [id], (err, result) => {
                if (err) reject(err)
                else resolve(result[0]);
            });
        })
        const leaveDaysOnJan1 = await calculateLeaveDaysForEmployeeOnJan1(employeeResult) 
        res.send({ ...employeeResult, leave_days_on_jan_1: leaveDaysOnJan1})
    }catch(err){
        res.status(500).send(err)
    }
    
});

app.get('/bankEmployee/:id',async  (req, res) => {
    const id = req.params.id;
    const query = `SELECT 
                        b.id,
                        b.first_name_en,
                        b.middle_name_en,
                        b.last_name_en,
                        b.maiden_en,
                        b.first_name_ar,
                        b.middle_name_ar,
                        b.last_name_ar,
                        b.maiden_ar,
                        b.date_of_birth,
                        br.relation AS relation,  
                        b.related_to, 
                        b.nssf_no, 
                        b.bank_pin,  
                        b.company_id,
                        c.company_name,
                        b.location,
                        l.location AS branch_location,
                        CONCAT(r.first_name_en, ' ', r.last_name_en) AS related_to_full_name
                    FROM 
                        bank_staff b
                    JOIN 
                        bank_company c ON b.company_id = c.id
                    JOIN 
                        bank_location l ON b.location = l.id
                    LEFT JOIN 
                        bank_staff r ON b.related_to = r.id
                    LEFT JOIN 
                        bank_relation br ON b.relation_id = br.id 
                    WHERE 
                        b.id = ?; 
                    `;
                    try{
                        const bankEmployeeResult = await new Promise((resolve, reject) => {
                            db.query(query, [id], (err, result) => {
                                if (err) reject(err)
                                else resolve(result[0]);
                            });
                        })
                        res.send({ ...bankEmployeeResult})
                    }catch(err){
                        res.status(500).send(err)
                    }


});


app.post('/insert-bank-bill', async (req, res) => {
    LoggedInUser = getIdFromToken(req)
    try {
        const { payment_id, invoice_date, ensured_id } = req.body;

        if (!payment_id || !invoice_date || !ensured_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        db.query(
            `INSERT INTO bank_bills (payment_id, invoice_date, ensured_id, userId) VALUES (?, ?, ?, ?)`,
            [payment_id, invoice_date, ensured_id, LoggedInUser], (err, result) => {
                if(err){
                    console.error('Error inserting bill:', error);
                }
                const bill_id = result.insertId;
                res.status(201).json({ bill_id });
            });

    } catch (error) {
        console.error('Error inserting bill:', error);
        res.status(500).json({ error: 'Failed to insert bill' });
    }
});



app.post('/insert-medical-cases', async (req, res) => {
    try {
        const { medicalCases } = req.body;

        if (!medicalCases || !medicalCases.length) {
            return res.status(400).json({ error: 'No medical cases provided' });
        }

        // Create an array of promises to insert each medical case
        const promises = medicalCases.map((caseData) =>
            // Use the promise-based query method for each medical case
            db.promise().query(
                `INSERT INTO bank_medical_cases (bill_id, item_id, nssf_amount, nssf_share, invoice_amount, bank_share, total_lbp, total_dollars) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    caseData.bill_id,
                    caseData.item_id,
                    caseData.nssf_amount,
                    caseData.nssf_share,
                    caseData.invoice_amount,
                    caseData.bank_share,
                    caseData.total_lbp,
                    caseData.total_dollars,
                ]
            )
        );

        // Wait for all insertions to complete
        await Promise.all(promises);

        // Send success response after all cases are inserted
        res.status(201).json({ message: 'Medical cases inserted successfully' });
    } catch (error) {
        console.error('Error inserting medical cases:', error);
        res.status(500).json({ error: 'Failed to insert medical cases' });
    }
});






app.get('/employee/:id/starting-balance', async (req, res)=>{
    const id = req.params.id;
    const currentYear = new Date().getFullYear()
    const jan1Date = `${currentYear}-01-01`;

    const balanceQuery = `
        SELECT balance_after FROM leave_balance_log WHERE employee_id = ? AND DATE(log_date) = ? ORDER BY log_date DESC  LIMIT 1
    `;
    try{
        const result = await new Promise((resolve, reject)=>{
            db.query(balanceQuery, [id, jan1Date],(err, result)=>{
                if(err) reject(err)
                else resolve(result[0])
            })
        })

        if(result){
            res.status(200).json({startingBalance:result.balance_after})
        }else{
            res.status(200).json({startingBalance:null})
        }
    }catch(error){
        console.error('Error fetching starting balance:', err);
        res.status(500).json({message:'Error fetching starting balance.'})
    }
})

//Add a new employee to the database and calculate his leave days
app.post('/employee', hrAuthenticateToken, async (req, res) => {
    const { id, firstName, middleName, lastName, email, departmentId, managerId, birthday, startDate, endDate, locationId, firstApproverId } = req.body;
    const hrUserId = getIdFromToken(req); // Get HR user ID from token

    // Check if managerId is provided, if not, set it to NULL
    const managerIdValue = managerId ? managerId : null;
    const firstApproverIdValue = firstApproverId ? firstApproverId : null;

            const query = `
        INSERT INTO employee 
        (id, first_name, middle_name, last_name, email, department_id, manager_id, birthday, start_date, end_date, location_id, first_approver_id) 
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?);
    `;
    db.query(query, [id, firstName, middleName, lastName, email, departmentId, managerIdValue, birthday, startDate, endDate, locationId, firstApproverIdValue], (err, result) => {
        if (err) {
            res.send(err);
        } else {
            const newEmployeeId = id;

            isManager(newEmployeeId).then(isManagerImmediately => {
                console.log(`New Employee ID: ${newEmployeeId}`);
                console.log(`Is Manager Immediately: ${isManagerImmediately}`);

                const proratedLeaveDays = calculateLeaveDaysForPartialYear(startDate, endDate, isManagerImmediately);

                console.log(`Prorated Leave Days: ${proratedLeaveDays}`);

                db.query(`UPDATE employee SET days = ? WHERE id = ?`, [proratedLeaveDays, newEmployeeId], (err, updateResult) => {
                    if (err) {
                        console.error('Error updating prorated leave days:', err);
                        res.status(500).send(err);
                    } else {
                        const details = `Created new employee: ${firstName} ${lastName} (ID: ${newEmployeeId}), Department: ${departmentId}, Manager: ${managerIdValue}, First Approver: ${firstApproverIdValue}, Start Date: ${startDate}, End Date: ${endDate}`;
                        addLog(hrUserId, 'Create Employee', details);
                        res.send({ id: newEmployeeId });
                    }
                });
            }).catch(err => {
                console.error('Error checking if employee is a manager:', err);
                res.status(500).send(err);
            });
        }
    });
});


app.post('/add-insured', async (req, res) => {
    const {
        firstNameEn,
        middleNameEn,
        lastNameEn,
        maidenEn,
        firstNameAr,
        middleNameAr,
        lastNameAr,
        maidenAr,
        dateOfBirth,
        relation,
        relatedToId,
        nssfNo,
        bankPin,
        bankLocationId,
        bankCompanyId,
    } = req.body;

    const checkDuplicates = `
        SELECT * FROM bank_staff 
        WHERE first_name_en = ? AND date_of_birth = ? AND nssf_no = ? AND bank_pin = ?
    `;

    db.query(checkDuplicates, [firstNameEn, dateOfBirth, nssfNo, bankPin], (error, results) => {
        if (error) {
            console.error('Error checking for duplicates:', error);
            return res.status(500).send({ error: 'Server error while checking for duplicates' });
        }

        if (results.length > 0) {
            return res.status(409).send({ error: 'Duplicate insured detected' });
        }

        const insertQuery = `
            INSERT INTO bank_staff 
            (first_name_en, middle_name_en, last_name_en, maiden_en, first_name_ar, middle_name_ar, last_name_ar, maiden_ar, date_of_birth, relation_id, related_to, nssf_no, bank_pin, location, company_id) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
        `;

        db.query(insertQuery, [firstNameEn, middleNameEn, lastNameEn, maidenEn, firstNameAr, middleNameAr, lastNameAr, maidenAr, dateOfBirth, relation, relatedToId, nssfNo, bankPin, bankLocationId, bankCompanyId], (err, result) => {
            if (err) {
                console.error('Error inserting insured:', err);
                return res.status(500).send({ error: 'Server error while adding insured' });
            }

            return res.status(200).send({ message: 'Insured added successfully', result });
        });
    });
});


app.patch('/employee/:id', hrAuthenticateToken, (req, res) => {
    const id = req.params.id;
    const hrUserId = getIdFromToken(req); // Get HR user ID from token

    db.query(`SELECT * FROM employee WHERE id = ?`, [id], (err, result) => {
        if (err) {
            res.send(err);
        } else {
            const originalEmployee = result[0];
            const updatedEmployee = { ...originalEmployee, ...camelToSnake(req.body) };
            const { first_name, middle_name, last_name, email, department_id, manager_id, birthday, start_date, end_date, location_id, days, first_approver_id } = updatedEmployee;
            let disable_reason, previous_dep;

            if(department_id !== 0 ){
                disable_reason = null;
                previous_dep = null
            }
            const query = `
                UPDATE employee
                SET first_name = ?, middle_name = ?, last_name = ?, email = ?, department_id = ?, manager_id = ?, days = ?, birthday = ?, start_date = ?, end_date = ?, location_id = ?, first_approver_id = ?, disable_reason = ?, previous_depID = ? 
                WHERE id = ?;
            `;
            db.query(query, [first_name, middle_name, last_name, email, department_id, manager_id, days, birthday, start_date, end_date, location_id, first_approver_id, disable_reason, previous_dep, id], (err, result) => {
                if (err) {
                    res.send(err);
                } else {
                    const changes = Object.keys(updatedEmployee)
                        .filter(key => updatedEmployee[key] !== originalEmployee[key])
                        .map(key => `${key}: ${originalEmployee[key]} => ${updatedEmployee[key]}`)
                        .join(', ');

                    addLog(hrUserId, 'Edit Employee', `Edited employee: ${first_name} ${last_name}, changes: ${changes}`);
                    res.send(result);
                }
            });
        }
    });
});


app.patch('/update-bank-employee/:id', (req, res) => {
    const id = req.params.id;
    const LoggedInUser = getIdFromToken(req); // Get HR user ID from token

    db.query(`SELECT * FROM bank_staff WHERE id = ?`, [id], (err, result) => {
        if (err) {
            console.error('Error fetching original employee:', err);
            return res.status(500).send(err);
        }

        if (result.length === 0) {
            return res.status(404).send({ message: 'Employee not found' });
        }

        const originalEmployee = result[0];

        // Convert camelCase request body to snake_case for DB
        const updates = camelToSnake(req.body);

        // Ensure correct mapping for location, company_id, relation_id
        const updatedEmployee = {
            ...originalEmployee,
            ...updates,
            location: updates.bank_location_id || originalEmployee.location,
            company_id: updates.bank_company_id || originalEmployee.company_id,
            relation_id: updates.relation || originalEmployee.relation_id,
            related_to: updates.related_to_id || originalEmployee.related_to
        };

        // console.log("Original Employee Data:", JSON.stringify(originalEmployee, null, 2));
        // console.log("Updated Employee Data:", JSON.stringify(updatedEmployee, null, 2));

        // Destructure only fields that exist in the `bank_staff` table
        const {
            first_name_en, middle_name_en, last_name_en,
            first_name_ar, middle_name_ar, last_name_ar,
            date_of_birth, location, company_id,
            relation_id, related_to, nssf_no, bank_pin
        } = updatedEmployee;

        const query = `
            UPDATE bank_staff
            SET 
                first_name_en = ?, middle_name_en = ?, last_name_en = ?, 
                first_name_ar = ?, middle_name_ar = ?, last_name_ar = ?, 
                date_of_birth = ?, location = ?, company_id = ?, 
                relation_id = ?, related_to = ?, nssf_no = ?, bank_pin = ?
            WHERE id = ?;
        `;

        const updateRelatedEmployeesQuery = `
            UPDATE bank_staff
            SET location = ?, company_id = ?, nssf_no = ?, bank_pin = ?
            WHERE related_to = ?;
        `;

        db.query(query, [
            first_name_en, middle_name_en, last_name_en,
            first_name_ar, middle_name_ar, last_name_ar,
            date_of_birth, location, company_id,
            relation_id, related_to, nssf_no, bank_pin, id
        ], (err, result) => {
            if (err) {
                console.error('Error updating main employee:', err);
                return res.status(500).send(err);
            }

            console.log('Main employee updated successfully.');

            // Update related employees
            db.query(updateRelatedEmployeesQuery, [
                location, company_id, nssf_no, bank_pin, id
            ], (err, relatedUpdateResult) => {
                if (err) {
                    console.error('Error updating related employees:', err);
                    return res.status(500).send(err);
                }

                console.log('Related employees updated successfully.');

                // Log changes
                const changes = Object.keys(originalEmployee)
                    .filter(key => 
                        updatedEmployee[key] !== undefined && 
                        updatedEmployee[key] !== originalEmployee[key]
                    )
                    .map(key => {
                        let originalValue = originalEmployee[key];
                        let updatedValue = updatedEmployee[key];

                        // Ensure date format consistency
                        if (key === "date_of_birth") {
                            originalValue = new Date(originalValue).toISOString().split("T")[0];
                            updatedValue = new Date(updatedValue).toISOString().split("T")[0];
                        }

                        return `${key}: ${originalValue} => ${updatedValue}`;
                    })
                    .join(', ');

                if (changes) {
                    addbankLog(LoggedInUser, 'Edit bank Employee', `Edited bank employee: ${first_name_en} ${last_name_en}, changes: ${changes}`);
                }

                res.status(200).send({
                    message: 'Employee and related employees updated successfully.',
                    updatedEmployee: updatedEmployee,
                    relatedUpdateResult
                });
            });
        });
    });
});




app.patch("/disable-user", hrAuthenticateToken, (req, res) => {
    const { employeeId, reason, previous_dep } = req.body;
    const hrUserId = getIdFromToken(req); // Get HR user ID from token

    // Validate the input
    if (!employeeId || !reason || reason.trim() === "") {
        return res.status(400).json({ message: "Employee ID and reason are required." });
    }

    // Update the employee to disable them
    const updateQuery = `UPDATE employee SET department_id = 0, disable_reason = ?, previous_depID = ?, manager_id = null, first_approver_id = null WHERE id = ?`;   

    // Execute the query to update the employee
    db.query(updateQuery, [reason, previous_dep, employeeId], (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ message: "Error disabling employee", error: err });
        }

        // Log the action: Employee disabling
        const logMessage = `Disabled employee with ID: ${employeeId}. Reason: ${reason}. Previous Department ID: ${previous_dep}`;
        console.log(logMessage);
        addLog(hrUserId, 'Disable Employee', logMessage);  

        // If the update is successful, send the results and stop execution
        return res.status(200).json({ message: "User disabled successfully", results });
    });
});


app.delete("/delete-holiday", hrAuthenticateToken ,(req, res) => {
    const { holidayId, holiday_desc } = req.body; // Extract holidayId from the body
    const hrUserId = getIdFromToken(req); // Get HR user ID from token


    if (!holidayId) {
        return res.status(400).json({ message: "Error getting the id of the holiday selected." });
    }

    const del_holiday_query = `DELETE FROM holidays WHERE id = ?`;

    db.query(del_holiday_query, [holidayId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Error deleting holiday", error: err });
        }
        const logMessage = `Deleted holiday, with description : ${holiday_desc}`;
        addLog(hrUserId, 'Delete Holiday', logMessage);
        
        return res.status(200).json({ message: "Holiday removed successfully", results: result });
    });
});



app.patch('/employees/update-approvers', hrAuthenticateToken, (req, res) => {
    const hrUserId = getIdFromToken(req); // Get HR user ID from token
    const { oldManagerId, newManagerId, oldFirstApproverId, newFirstApproverId } = req.body;

    // Log request data for debugging
    console.log("Updating Approvers Request Data:", { oldManagerId, newManagerId, oldFirstApproverId, newFirstApproverId });

    let changesLog = [];
    let errors = [];


    async function handleManagerUpdate(){
        try{
                        // Update manager_id if both oldManagerId and newManagerId are provided
            if (oldManagerId && newManagerId) {
                console.log(`Updating manager_id from ${oldManagerId} to ${newManagerId}`);
                const promotionDate = new Date();
                await setLeaveDaysOnPromotion(newManagerId, promotionDate)
                console.log(`Leave days adjusted for employee ID ${newManagerId}`)
                const updateManagerQuery = `UPDATE employee SET manager_id = ? WHERE manager_id = ?`;

                db.query(updateManagerQuery, [newManagerId, oldManagerId], async (err, result) => {
                    if (err) {
                        console.error("Error updating manager:", err);
                        errors.push(`Error updating manager: ${err.message}`);
                        return finalizeUpdate();
                    } else {
                        console.log(`Manager Update Result: ${JSON.stringify(result)}`);
                        if (result.affectedRows > 0) {
                            changesLog.push(`Updated manager_id: ${oldManagerId} => ${newManagerId}`);
                        }
                    }

                    // Check for next update only after manager update completes
                    updateFirstApprover();
                });
            } else {
                // If no manager update is needed, proceed to first approver update
                updateFirstApprover();
            }
        }catch(error){
            console.error('Error setting leave days on promotion:',error)
            errors.push(`error setting leave days on promotion: ${error.message}`)
            finalizeUpdate()
        }
    }

    // Function to update first approver
    function updateFirstApprover() {
        // Update first_approver_id if both oldFirstApproverId and newFirstApproverId are provided
        if (oldFirstApproverId && newFirstApproverId) {
            console.log(`Updating first_approver_id from ${oldFirstApproverId} to ${newFirstApproverId}`);
            const updateFirstApproverQuery = `UPDATE employee SET first_approver_id = ? WHERE first_approver_id = ?`;

            db.query(updateFirstApproverQuery, [newFirstApproverId, oldFirstApproverId], (err, result) => {
                if (err) {
                    console.error("Error updating first approver:", err);
                    errors.push(`Error updating first approver: ${err.message}`);
                } else {
                    console.log(`First Approver Update Result: ${JSON.stringify(result)}`);
                    if (result.affectedRows > 0) {
                        changesLog.push(`Updated first_approver_id: ${oldFirstApproverId} => ${newFirstApproverId}`);
                    }
                }

                // After all updates, send response and log changes
                finalizeUpdate();
            });
        } else {
            // No first approver update needed, finalize the response
            finalizeUpdate();
        }
    }

    // Function to send final response and log changes
    function finalizeUpdate() {
        if (changesLog.length > 0) {
            const logMessage = changesLog.join(', ');
            addLog(hrUserId, 'Update Approvers', `HR updated: ${logMessage}`);
        }

        if (errors.length > 0) {
            res.status(400).json({ success: false, errors });
        } else {
            res.json({ success: true, message: 'Update successful', changes: changesLog });
        }
    }
    handleManagerUpdate();
});
app.delete('/employee/:id', async (req, res) => {
    const id = req.params.id;
    var query = `
        DELETE FROM employee 
        WHERE id = ${id};
    `;
    db.query(query, (err, result) => {
        if (err) res.send(err);
        else res.send(result);
    });
});
app.patch('/departments/:id', hrAuthenticateToken, (req, res) => {
    const departmentId = req.params.id;
    const { name} = req.body;
    const hrUserId = getIdFromToken(req); // Get HR user ID from the token

    if(!name){
        return res.status(400).send({error: 'Department name required'})
    }

        const updateDepartmentQuery = `
            UPDATE department
            SET name = ?
            WHERE id = ?;
        `;

        db.query(updateDepartmentQuery, [name, departmentId], (err, result) => {
            if (err) {
                console.error('Error updating department:', err);
                return res.status(500).send(err);
            }
            if(result.affectedRows === 0){
                return res.status(404).send({error: 'Department not found'})
            }
            addLog(hrUserId, 'Update Department', `Updated department ID: ${departmentId}, changed name to: ${name}`);
            res.send({ message: 'Department updated successfully' });
        });
});


app.patch('/bank-branch/:id', (req, res) => {
    const branchId = req.params.id;
    const {name} = req.body;
    const LoggedInUser = getIdFromToken(req); 

    if(!name){
        return res.status(400).send({error: 'Branch name required'})
    }

        const updateBranchQuery = `
            UPDATE bank_location
            SET location = ?
            WHERE id = ?;
        `;

        db.query(updateBranchQuery, [name, branchId], (err, result) => {
            if (err) {
                console.error('Error updating branch:', err);
                return res.status(500).send(err);
            }
            if(result.affectedRows === 0){
                return res.status(404).send({error: 'Branch not found'})
            }
            addbankLog(LoggedInUser, "Updated Branch", `Updated branch with ID: ${branchId}, changed name to: ${name}`);
            res.send({ message: 'Branch updated successfully' });
        });
});

app.patch('/bank-company/:id', (req, res) => {
    const companyId = req.params.id;
    const {name} = req.body;
    const LoggedInUser = getIdFromToken(req); 

    if(!name){
        return res.status(400).send({error: 'Company name required'})
    }

        const updateBranchQuery = `
            UPDATE bank_company
            SET company_name = ?
            WHERE id = ?;
        `;

        db.query(updateBranchQuery, [name, companyId], (err, result) => {
            if (err) {
                console.error('Error updating company:', err);
                return res.status(500).send(err);
            }
            if(result.affectedRows === 0){
                return res.status(404).send({error: 'Company not found'})
            }
            addbankLog(LoggedInUser, "Updated Company", `Updated company with ID: ${companyId}, changed name to: ${name}`);
            res.send({ message: 'Company updated successfully' });
        });
});


app.patch('/bank-item/:id', (req, res) => {
    const itemId = req.params.id;
    let { item_name, price, percentage } = req.body;
    const LoggedInUser = getIdFromToken(req); 

    if (!item_name || percentage === undefined) {
        return res.status(400).send({ error: 'Item name and percentage are required' });
    }

    // Ensure price is properly converted to null if empty
    const priceValue = price === undefined || price === "" ? null : parseFloat(price);
    const percentageValue = percentage === undefined || percentage === "" || isNaN(Number(percentage)) ? null : parseFloat(percentage);

    // Fetch the current values from the database
    const getCurrentItemQuery = 'SELECT * FROM bank_items WHERE id = ?';
    db.query(getCurrentItemQuery, [itemId], (err, result) => {
        if (err) {
            console.error('Error fetching item:', err);
            return res.status(500).send({ error: 'Internal server error' });
        }

        if (result.length === 0) {
            return res.status(404).send({ error: 'Item not found' });
        }

        const currentItem = result[0];
        const oldPrice = currentItem.price;
        const oldPercentage = currentItem.percentage;

        // Update the item if price or percentage has changed
        const updateItemQuery = `
            UPDATE bank_items
            SET item_name = ?, price = ?, percentage = ?
            WHERE id = ?;
        `;
        db.query(updateItemQuery, [item_name, priceValue, percentageValue, itemId], (err, updateResult) => {
            if (err) {
                console.error('Error updating item:', err);
                return res.status(500).send({ error: 'Internal server error' });
            }

            if (updateResult.affectedRows === 0) {
                return res.status(404).send({ error: 'Item not found' });
            }

            // Log the changes only if price or percentage was updated
            if (priceValue !== oldPrice || percentageValue !== oldPercentage) {
                const insertLogQuery = `
                    INSERT INTO bank_items_logs (userId, item_id, oldprice, old_percentage, new_price, new_percentage)
                    VALUES (?, ?, ?, ?, ?, ?);
                `;
                db.query(insertLogQuery, [
                    LoggedInUser,
                    itemId,
                    oldPrice,
                    oldPercentage,
                    priceValue,
                    percentageValue
                ], (err, logResult) => {
                    if (err) {
                        console.error('Error logging item update:', err);
                    }
                });
            }

            res.send({ message: 'Item updated successfully' });
        });
    });
});






async function addBirthdayLeave() {
    const today = moment().format('MM-DD');

    const query = `
        SELECT id, first_name, last_name, days 
        FROM employee 
        WHERE DATE_FORMAT(birthday, '%m-%d') = ?
    `;

    try {
        const employees = await db.promise().query(query, [today]);

        for (const employee of employees[0]) {
            const { id, first_name, last_name, days: currentDays } = employee;
            let currentDaysNum = parseFloat(currentDays); // Ensure it's a number

            const newBalance = currentDaysNum + 1;
            // Log balance change
            const logBalanceQuery = `
                INSERT INTO leave_balance_log (employee_id, balance_before, balance_after, log_date) 
                VALUES (?, ?, ?, NOW())
            `;
            await db.promise().query(logBalanceQuery, [id, currentDays, newBalance]);

            // Update employee leave days
            const updateQuery = `UPDATE employee SET days = ? WHERE id = ?`;
            await db.promise().query(updateQuery, [newBalance, id]);

            // Add leave request for the birthday leave
            const leaveRequestQuery = `
                INSERT INTO leave_requests (employee_id, type_of_leave, request_status, quantity, start_date, end_date, last_modified) 
                VALUES (?, 'Birthday', 'Add', 1, NOW(), NOW(), NOW())
            `;
            const [leaveRequestResult] = await db.promise().query(leaveRequestQuery, [id]);

            // Insert leave date
            const dateQuery = `
                INSERT INTO leave_request_dates (leave_request_id, leave_date, duration, time) 
                VALUES (?, NOW(), ?, ?)
            `;
            await db.promise().query(dateQuery, [leaveRequestResult.insertId, 1, null]);

            // Log the action
            const logQuery = `
                INSERT INTO logs (hr_user, hr_user_name, action, details, timestamp) 
                VALUES ('0', 'System', 'Birthday', ?, NOW())
            `;
            await db.promise().query(
                logQuery,
                [`Added 1 day for birthday to ${first_name} ${last_name}`]
            );
            
        }
    } catch (error) {
        console.error('Error processing birthday leaves:', error);
    }
}




// Schedule the addBirthdayLeave function to run daily at midnight
// cron.schedule('0 0 * * *', () => {
//     console.log('Starting sequence for birthday leaves.');
//     addBirthdayLeave();
//     console.log("Birthday leaves added succesfully.");
// });


//Check if the email exists and if it does check if it has a password
app.get('/initial/login/:email', (req, res) => {
    const email = req.params.email;
    var query = `
        SELECT 
        (EXISTS (
            SELECT 1 
            FROM employee 
            WHERE email = ?
        )) AS email_exists,
        (EXISTS (
            SELECT 1 
            FROM employee 
            WHERE email = ?
            AND password IS NULL
        )) AS password_is_null;
    `;
    db.query(query, [email, email], (err, result) => {
        if (err) res.send(err);
        else res.send(result[0]);
    })
});


//Fetch the user's info and check his employement rank (HR, Manager, First Approver)
app.post('/login', async (req, res) => {
    const { email, password, isInitialLogin } = req.body;

    const userQuery = `SELECT * FROM employee WHERE email = ?`;
    db.query(userQuery, [email], async (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else if (result.length === 0) {
            res.status(401).send({ message: 'Invalid email' });
        } else {
            const user = result[0];

            const isNSSF = user.isNSSF;
            
            // Check if the user is a manager
            const isManagerQuery = `
                SELECT COUNT(*) AS is_manager FROM employee WHERE manager_id = ?
            `;
            db.query(isManagerQuery, [user.id], (err, managerResult) => {
                if (err) {
                    res.status(500).send(err);
                } else {
                    const isManager = managerResult[0].is_manager > 0;

                    // Check if the user is a first approver
                    const isFirstApproverQuery = `
                            SELECT COUNT(*) AS is_first_approver 
                            FROM employee WHERE first_approver_id = ?
                    `;
                    db.query(isFirstApproverQuery, [user.id], (err, firstApproverResult) => {
                        if (err) {
                            res.status(500).send(err);
                        } else {
                            const isFirstApprover = firstApproverResult[0].is_first_approver > 0;

                            if (isInitialLogin) {
                                bcrypt.hash(password, bcrypt.genSaltSync(12), (err, hashedPassword) => {
                                    if (err) res.send(err);
                                    db.query('UPDATE employee SET password = ? WHERE id = ?', [hashedPassword, user.id], (err, result) => {
                                        if (err) res.send(err);
                                        
                                        const token = jwt.sign(
                                            { id: user.id, is_hr: user.department_id == 1, is_manager: isManager, is_first_approver: isFirstApprover, isNSSF: isNSSF},
                                            jwt_secret,
                                            { expiresIn: '12h' }
                                        );
                                        
                                        console.log(`LOGIN: User ${user.first_name} ${user.last_name} logged in with email ${email} ; ${new Date().toLocaleString()}`);
                                        res.send({ 
                                            message: 'Login successful',
                                            token, 
                                            firstName: user.first_name, 
                                            lastName: user.last_name, 
                                            department: user.department_id,
                                            isHr: user.department_id == 1,
                                            isManager: isManager,
                                            isFirstApprover: isFirstApprover,
                                            isNSSF: isNSSF
                                        });
                                    });
                                });
                            } else {
                                bcrypt.compare(password, user.password, (err, isMatch) => {
                                    if (isMatch) {
                                        const token = jwt.sign(
                                            { id: user.id, is_hr: user.department_id == 1, is_manager: isManager, is_first_approver: isFirstApprover, isNSSF: isNSSF},
                                            jwt_secret,
                                            { expiresIn: '12h' }
                                        );
                                        console.log(`LOGIN: User ${user.first_name} ${user.last_name} logged in with email ${email} ; ${new Date().toLocaleString()}`);
                                        res.send({ 
                                            message: 'Login successful', 
                                            token, 
                                            firstName: user.first_name, 
                                            lastName: user.last_name, 
                                            department: user.department_id,
                                            isHr: user.department_id == 1,
                                            isManager: isManager,
                                            isFirstApprover: isFirstApprover,
                                            isNSSF: user.isNSSF
                                        });
                                    } else {
                                        res.status(401).send({ message: 'Invalid email or password' });
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }
    });
});




app.get('/departments', (req, res) => {
    var query = `
        SELECT id, name FROM department
    `;
    db.query(query, (err, result) => {
        if (err) res.send(err);
        else res.send(result);
})});


app.get('/bank_companies', (req, res) => {
    var query = `
        SELECT id, company_name FROM bank_company
    `;
    db.query(query, (err, result) => {
        if (err) res.send(err);
        else res.send(result);
})});


app.get('/bank_items', (req, res) => {
    var query = `
        SELECT id, item_name, price, percentage*100 as percentage FROM bank_items
    `;
    db.query(query, (err, result) => {
        if (err) res.send(err);
        else res.send(result);
})});



app.post('/add-item', (req, res) => {
    const { item_name, price, percentage } = req.body;

    if (!item_name || price === undefined || percentage === undefined) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const sql = 'INSERT INTO bank_items (item_name, price, percentage) VALUES (?, ?, ?)';
    db.query(sql, [item_name, parseFloat(price), parseFloat(percentage)], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error inserting item' });
        }
        res.json({ id: result.insertId, item_name, price, percentage });
    });
});


app.post('/departments', hrAuthenticateToken, async (req, res) => {
    const { name} = req.body;
    const hrUserId = getIdFromToken(req); // Get HR user ID from token

    const query = `
        INSERT INTO department (name)
        VALUES (?);
    `;
    db.query(query, [name], (err, result) => {
        if (err) {
            res.send(err);
        } else {
            const newDepartmentId = result.insertId;
            db.query(`SELECT * FROM department WHERE id = ?`, [newDepartmentId], (err, newDeptResult) => {
                if (err) {
                    res.send(err);
                } else {
                    addLog(hrUserId, 'Add Department', `Added department: ${name}`);
                    res.send(newDeptResult[0]);
                }
            });
        }
    });
});


app.post('/add-branch', async (req, res) => {
    const { location } = req.body;

    // Check if branch already exists
    const duplicateCheckQuery = `SELECT * FROM bank_location WHERE location = ?`;
    db.query(duplicateCheckQuery, [location], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send({ error: 'Database error' });
            return;
        }

        if (results.length > 0) {
            res.status(400).send({ error: 'Branch already exists' });
            return;
        }

        // Insert new branch
        const insertQuery = `INSERT INTO bank_location (location) VALUES (?);`;
        db.query(insertQuery, [location], (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send({ error: 'Error adding branch' });
            } else {
                const newBranchId = result.insertId;
                db.query(`SELECT * FROM bank_location WHERE id = ?`, [newBranchId], (err, newLocResult) => {
                    if (err) {
                        console.error(err);
                        res.status(500).send({ error: 'Error fetching new branch' });
                    } else {
                        res.status(201).send(newLocResult[0]);
                    }
                });
            }
        });
    });
});


app.post('/add-company', async (req, res) => {
    const company_name = req.body.location;

    // Check if branch already exists
    const duplicateCheckQuery = `SELECT * FROM bank_company WHERE company_name = ?`;
    db.query(duplicateCheckQuery, [company_name], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send({ error: 'Database error' });
            return;
        }

        if (results.length > 0) {
            res.status(400).send({ error: 'Company already exists' });
            return;
        }
        // Insert new company
        const insertQuery = `INSERT INTO bank_company (company_name) VALUES (?);`;
        db.query(insertQuery, [company_name], (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send({ error: 'Error adding company' });
            } else {
                const newCompanyId = result.insertId;
                db.query(`SELECT * FROM bank_company WHERE id = ?`, [newCompanyId], (err, newComResult) => {
                    if (err) {
                        console.error(err);
                        res.status(500).send({ error: 'Error fetching new company' });
                    } else {
                        res.status(201).send(newComResult[0]);
                    }
                });
            }
        });
    });
});


app.post('/add-new-payment', async (req, res) => {
    const newPayment = req.body; 

    const insertQuery = `
        INSERT INTO bank_payment (payment_name, description, rate, user)
        VALUES (?, ?, ?, ?)
    `;
    db.query(insertQuery, [newPayment.payment_name, newPayment.description, newPayment.rate, newPayment.userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: 'Error adding payment' });
        }

        const newPaymentId = result.insertId; 
        db.query(`SELECT * FROM bank_payment WHERE id = ?`, [newPaymentId], (err, newPayResult) => {
            if (err) {
                console.error(err);
                return res.status(500).send({ error: 'Error fetching new payment' });
            }
            res.status(201).send(newPayResult[0]);
        });
    });
});



app.get('/bank_payments', (req, res) => {
    var query = `
                SELECT 
                bp.id, 
                bp.payment_name, 
                bp.description, 
                bp.rate, 
                bp.status, 
                CONCAT(e.first_name, ' ', e.last_name) AS user
            FROM 
                bank_payment bp
            JOIN 
                employee e ON bp.user = e.id;
            `;
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching payments:', err);
            return res.status(500).send({ error: 'Error fetching payments' });
        }
        res.status(200).json(result);
    });
});


app.get('/get-rate', (req, res) => {
    const id = req.query.paymentId; 
    const query = `SELECT rate FROM bank_payment WHERE id = ?`;

    db.query(query, [id], (err, rateRes) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: 'Error fetching payment rate' });
        }

        if (rateRes.length === 0) {
            return res.status(404).send({ error: 'Payment rate not found' });
        }

        res.status(200).send(rateRes[0]);
    });
});



app.get('/get-items', (req, res) => {
    var query = `
                SELECT * FROM bank_items;
            `;
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching items:', err);
            return res.status(500).send({ error: 'Error fetching items' });
        }
        res.status(200).json(result);
    });
});



app.patch('/close-payment', async (req, res) => {
    const { id } = req.body; 
    if (!id) {
        return res.status(400).send({ error: 'Payment ID is required' });
    }

    const updateQuery = 'UPDATE bank_payment SET status = ? WHERE id = ?';
    
    db.query(updateQuery, ['closed', id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: 'Error closing payment' });
        }
        res.status(200).send({ message: 'Payment closed successfully' });
    });
});


app.patch('/activate-payment', async (req, res) => {
    const { id } = req.body; 
    if (!id) {
        return res.status(400).send({ error: 'Payment ID is required' });
    }

    const updateQuery = 'UPDATE bank_payment SET status = ? WHERE id = ?';
    
    db.query(updateQuery, ['active', id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: 'Error closing payment' });
        }
        res.status(200).send({ message: 'Payment closed successfully' });
    });
});



app.get('/bank_active_payments', (req, res) => {
    var query = `
                SELECT 
                bp.id, 
                bp.payment_name, 
                bp.description, 
                bp.rate, 
                bp.status, 
                CONCAT(e.first_name, ' ', e.last_name) AS user
            FROM 
                bank_payment bp
            JOIN 
                employee e ON bp.user = e.id
            WHERE 
                bp.status = 'active';
            `;
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching active payments:', err);
            return res.status(500).send({ error: 'Error fetching active payments' });
        }
        res.status(200).json(result); 
    });
});





app.post('/leave-requests', authenticateToken, upload.single('attachment'), (req, res) => {
    const { employeeId, typeOfLeave, quantity, leaveDetails } = req.body;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear= new Date().getFullYear()
    const attachment = req.file ? req.file.filename : null;
    let parsedLeaveDetails;
    console.log(req.file);

    try {
        parsedLeaveDetails = JSON.parse(leaveDetails);  
    } catch (error) {
        return res.status(400).send({ message: 'Invalid leave details' });
    }

    // Fetch holidays
    const holidayQuery = `SELECT start_date, end_date FROM holidays`;

    db.query(holidayQuery, (err, holidays) => {
        if (err) {
            console.error('Error fetching holidays:', err);
            return res.status(500).send(err);
        }

        // Extract the leave dates from parsedLeaveDetails
        const leaveDates = parsedLeaveDetails.map(detail => detail.date);
        const isHoliday = holidays.some(holiday => {
            const startDate = moment(holiday.start_date);
            const endDate = moment(holiday.end_date);
            return leaveDates.some(date => moment(date).isBetween(startDate, endDate, 'days', '[]'));
        });

        if (isHoliday) {
            return res.status(400).send({ message: 'Leave request cannot be made on holidays' });
        }

        if(typeOfLeave === 'Annual Paid Leave'){
            const balanceQuery = `SELECT days FROM employee WHERE id=?`;
            db.query(balanceQuery, [employeeId], (err, balanceResult)=>{
                if(err){
                    console.error('Error fetching leave balance:', err);
                }
                if(balanceResult.length === 0){
                    return res.status(404).send({message:'Employee not found'})
                }
                const leaveBalance = parseFloat(balanceResult[0].days)
                const pendingLeaveDaysQuery=`
                    SELECT SUM(quantity) AS total_pending_days
                    FROM leave_requests
                    WHERE employee_id = ? AND YEAR(start_date) = ? AND YEAR(end_date) = ? AND request_status IN ('Pending First Approval', 'Pending Manager') AND type_of_leave = 'Annual Paid Leave'
                `;
                db.query(pendingLeaveDaysQuery, [employeeId, currentYear, currentYear],(err, leaveDaysResult)=>{
                    if(err){
                        console.error('Error calculating pedning leave days:',err);
                        return res.status(500).send(err)
                    }
                    const totalPendingDays = parseFloat(leaveDaysResult[0].total_pending_days) || 0;
                    const requestQuantity = parseFloat(quantity)
                    const totalAfterNewRequest = totalPendingDays+requestQuantity

                    if(totalAfterNewRequest>leaveBalance){
                        return res.status(400).send({message:"Insufficient balance to make this request."})
                    }
                    determineInitialStatusAndInsert()
                })
            })
        }else{
            handleSpecialLeaveTypes()
        }


        function handleSpecialLeaveTypes(){
                    // Handle special leave types: Sick Leave Without Note, Unpaid Leave
            if (typeOfLeave === 'Sick Leave Allowed') {
                const checkSickLeaveQuery = `
                    SELECT SUM(quantity) as total
                    FROM leave_requests
                    WHERE employee_id = ? AND type_of_leave = 'Sick Leave Allowed' AND request_status NOT IN ('Cancelled', 'Rejected') AND YEAR(leave_requests.start_date) = ? AND YEAR(leave_requests.end_date) = ? 
                `;

                db.query(checkSickLeaveQuery, [employeeId, currentYear, currentYear], (err, results) => {
                    if (err) {
                        console.error('Database query error:', err);
                        return res.status(500).send(err);
                    }

                    const totalDaysWithoutNote = parseFloat(results[0].total) || 0;
                    const requestQuantity = parseFloat(quantity);
                    const totalRequested = totalDaysWithoutNote + requestQuantity;

                    if (totalRequested > 2) {
                        return res.status(400).send({ message: 'You cannot request more than 2 sick leave days without a note.' });
                    }

                    determineInitialStatusAndInsert();
                });
            } else if (typeOfLeave === 'Unpaid Leave') {
                const checkUnpaidLeaveQuery = `
                    SELECT SUM(quantity) as total
                    FROM leave_requests
                    WHERE employee_id = ? AND type_of_leave = 'Unpaid Leave' AND request_status NOT IN ('Cancelled', 'Rejected') AND YEAR(leave_requests.start_date) = ? AND YEAR(leave_requests.end_date) = ? 
                `;

                db.query(checkUnpaidLeaveQuery, [employeeId, currentYear, currentYear], (err, results) => {
                    if (err) {
                        console.error('Database query error:', err);
                        return res.status(500).send(err);
                    }

                    const totalUnpaidLeaveDays = parseFloat(results[0].total) || 0;
                    const requestQuantity = parseFloat(quantity);
                    const totalRequested = totalUnpaidLeaveDays + requestQuantity;

                    if (totalRequested > 5) {
                        return res.status(400).send({ message: 'You cannot request more than 5 unpaid leave days.' });
                    }

                    determineInitialStatusAndInsert();
                });
            } else {
                determineInitialStatusAndInsert();
            }
        }

        function determineInitialStatusAndInsert() {
            const firstApprovalQuery = `
                SELECT first_approver_id, first_name, last_name, manager_id
                FROM employee WHERE id = ?;
            `;
        
            db.query(firstApprovalQuery, [employeeId], (err, results) => {
                if (err) {
                    console.error('Database query error:', err);
                    return res.status(500).send(err);
                }
        
                if (results.length > 0) {
                    const firstApprovalId = results[0].first_approver_id;
                    const managerId = results[0].manager_id;
                    // Determine the initial status
                    const initialStatus = firstApprovalId ? "Pending First Approval" : "Pending Manager";
        
                    const insertedLeaves = insertLeaveRequest(initialStatus);
                    if(insertedLeaves == 5){
                        return;
                    }

                    if (firstApprovalId) {
                        // Fetch email and name of the first approver
                        const approverDetailsQuery = `
                            SELECT email, first_name
                            FROM employee WHERE id = ?;
                        `;
        
                        db.query(approverDetailsQuery, [firstApprovalId], (err, approverResults) => {
                            if (err) {
                                console.error('Database query error:', err);
                                return res.status(500).send(err);
                            }
        
                            if (approverResults.length > 0) {
                                const approverEmail = approverResults[0].email;
                                const approverName = approverResults[0].first_name;
                                const employeeName = results[0].first_name+" "+results[0].last_name;
        
                                const to = approverEmail;
                                const subject = "New Leave Request for Review";
                                const text = `Dear ${approverName},\n\nYou have a new leave request to review for employee ${employeeName}.`;
                                const link = `http://custom-application:3000/first-approval-requests`;
        
                                // Send email notification
                                sendEmailNotifications(to, subject, text, link);
                            }
                        });
                    }
                    else if(!firstApprovalId){
                        const managerDetailsQuery = `
                            SELECT email, first_name FROM employee WHERE id = ?;
                        `;
                        db.query(managerDetailsQuery, [managerId], (err, managerResults) => {
                            if (err) {
                                console.error('Error fetching manager details:', err);
                                return res.status(500).send(err);
                            }
                            if (managerResults.length > 0) {
                                const managerEmail = managerResults[0].email;
                                const managerName = managerResults[0].first_name;
                                const employeeName = results[0].first_name + " " + results[0].last_name;
                                const subject = "New Leave Request";
                                const text = `Dear ${managerName},\n\nYou have a new leave request to approve for employee ${employeeName}.`;
                                const link = `http://custom-application:3000/manager-leave-requests`;

                                // Send email notification to the manager
                                sendEmailNotifications(managerEmail, subject, text, link);
                            }
                        });
                    }
        
                } else {
                    return res.status(404).send('Employee not found');
                }
            });
        }

        function insertLeaveRequest(initialStatus) {
            // Calculate start date and end date using parsedLeaveDetails
            if (!Array.isArray(parsedLeaveDetails) || parsedLeaveDetails.length === 0) {
                console.error('parsedLeaveDetails is either not an array or is empty');
                return 5;
            }

            if (!parsedLeaveDetails.every(detail => detail.date)) {
                console.error('One or more objects in parsedLeaveDetails are missing the "date" property');
                return 5;
            }
            
            let startDate = parsedLeaveDetails.sort((a, b) => new Date(a.date) - new Date(b.date))[0].date;
            let endDate;
            let calculatedQuantity;
            let dateRange = [];

            if (typeOfLeave === 'Marital') {
                calculatedQuantity = 7.0;
                endDate = moment(startDate).add(6, 'days').format('YYYY-MM-DD');
                dateRange = Array.from({ length: 7 }, (_, i) => moment(startDate).add(i, 'days').format('YYYY-MM-DD'));
            } else if (typeOfLeave === 'Maternity') {
                calculatedQuantity = 70.0;
                endDate = moment(startDate).add(69, 'days').format('YYYY-MM-DD');
                dateRange = Array.from({ length: 70 }, (_, i) => moment(startDate).add(i, 'days').format('YYYY-MM-DD'));
            } else if (typeOfLeave === 'Paternity') {
                calculatedQuantity = 3.0;
                endDate = moment(startDate).add(2, 'days').format('YYYY-MM-DD');
                dateRange = Array.from({ length: 3 }, (_, i) => moment(startDate).add(i, 'days').format('YYYY-MM-DD'));
            } else {
                calculatedQuantity = quantity;
                endDate = parsedLeaveDetails[parsedLeaveDetails.length - 1].date;
                dateRange = parsedLeaveDetails.map(detail => detail.date);
            }

            const query = `
                INSERT INTO leave_requests (employee_id, type_of_leave, request_status, quantity, start_date, end_date, last_modified, attachment)
                VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
            `;

            db.query(query, [employeeId, typeOfLeave, initialStatus, calculatedQuantity, startDate, endDate, attachment], (err, result) => {
                if (err) {
                    console.error('Error adding leave request:', err);
                    return res.status(500).send(err);
                }

                const leaveRequestId = result.insertId;

                // Insert each date from the parsedLeaveDetails into the leave_request_dates table
                const dateQueries = dateRange.map(date => (
                    new Promise((resolve, reject) => {
                        const dateQuery = `
                            INSERT INTO leave_request_dates (leave_request_id, leave_date, duration, start_time, end_time, time)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `;
                        const detail = parsedLeaveDetails.find(detail=>detail.date === date) || {};
                        // const duration = detail.duration || '1.0';
                        const duration = (typeOfLeave === 'Personal Time Off') ? 0 : (detail.duration || '1.0');
                        const time = detail.time || 'N/A';
                        const startTime = detail.start_time || null;
                        const endTime = detail.end_time || null;
                        db.query(dateQuery, [leaveRequestId, date, duration, startTime, endTime, time], (err, dateResult) => {
                            if (err) reject(err);
                            else resolve(dateResult);
                        });
                    })
                ));

                Promise.all(dateQueries)
                    .then(() => {
                        res.send({ message: `Leave request added successfully and ${initialStatus === 'Pending First Approval' ? 'awaiting first approval' : 'sent to manager'}` });
                    })
                    .catch(err => {
                        console.error('Error adding leave request dates:', err);
                        return 5;
                    });
            });
        }
    });
});

app.get('/first-approval-requests', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
                    SELECT 
                        lr.id,
                        lr.employee_id AS employeeId, 
                        CONCAT(e.first_name, ' ', e.last_name) AS name,
                        lr.type_of_leave AS typeOfLeave, 
                        lr.request_status AS requestStatus, 
                        lr.attachment,
                        SUM(ld.duration) AS quantity,
                        CASE 
                            WHEN lr.type_of_leave IN ('Maternity', 'Paternity', 'Marital') 
                            THEN CONCAT(lr.start_date, ' -> ', lr.end_date)
                            ELSE GROUP_CONCAT(ld.leave_date)
                        END AS dates,
                        GROUP_CONCAT(
                            CASE 
                                WHEN lr.type_of_leave = 'Personal Time Off' THEN CONCAT(DATE_FORMAT(ld.start_time, '%H:%i'), ' -> ', DATE_FORMAT(ld.end_time, '%H:%i'))
                                WHEN ld.duration = 0.5 THEN ld.time
                                ELSE 'N/A'
                            END
                        ) AS time,
                        lr.last_modified AS lastModified 
                    FROM leave_requests lr
                    JOIN employee e ON lr.employee_id = e.id
                    LEFT JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
                    WHERE lr.request_status in ('Pending First Approval', 'Cancel Requested - Pending First Approval')
                    AND ( first_approver_id = ? )
                    GROUP BY lr.id
                    ORDER BY lastModified DESC;

    `;
    db.query(query, [userId], (err, result) => {
        if (err) res.send(err);
        else res.send(result);
    });
});
app.get('/first-approver-leaves', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
                    SELECT 
                        e.id AS employee_id,
                        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                        lr.type_of_leave,
                        lr.request_status,
                        ld.leave_date,
                        ld.duration,
                        ld.time
                    FROM leave_requests lr
                    JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
                    JOIN employee e ON lr.employee_id = e.id
                    WHERE lr.request_status IN ('Approved', 'Pending First Approval', 'Pending Manager')
                    AND first_approver_id = ?;
    `;
    db.query(query, [userId], (err, result) => {
        if (err) res.status(500).send(err);
        else res.send(result);
    });
});

app.patch('/leave-requests/:id/first-approve', authenticateToken, (req, res) => {
    const requestId = req.params.id;
    const action = req.body.action; // 'approve' or 'reject'

    let newStatus;
    if (action === 'approve') {
        newStatus = 'Pending Manager';
    } else if (action === 'reject') {
        newStatus = 'Rejected';
    } else {
        return res.status(400).send({ message: 'Invalid action' });
    }

    const query = `
        UPDATE leave_requests
        SET request_status = ?, last_modified = NOW()
        WHERE id = ? AND request_status = 'Pending First Approval'
    `;

    db.query(query, [newStatus, requestId], (err, result) => {
        if (err) {
            console.error('Error updating leave request:', err);
            return res.status(500).send(err);
        }
        if(action === 'approve'){
            const fetchEmployeeManagerQuery=`
                SELECT e.first_name AS employee_first_name, e.last_name AS employee_last_name, m.email AS manager_email, m.first_name AS manager_first_name, m.last_name AS manager_last_name
                FROM leave_requests lr
                JOIN employee e ON lr.employee_id = e.id
                JOIN employee m ON e.manager_id = m.id
                WHERE lr.id=?
            `;
            db.query(fetchEmployeeManagerQuery, [requestId], (err, results) => {
                if(err){
                    console.error('Error fetching employee or manager details:', err)
                    return res.status(500).send(err)
                }
                if(results.length > 0){
                    const employeeName = `${results[0].employee_first_name} ${results[0].employee_last_name}`
                    const managerName = `${results[0].manager_first_name} ${results[0].manager_last_name}`
                    const managerEmail = results[0].manager_email

                    const subject = 'New Leave Request'
                    const text = `Dear ${managerName},\n\nYou have a new leave request from ${employeeName} pending your approval. \n\nPlease review at your earliest convenience.\n\nBest regards`
                    const link = `http://custom-application:3000/manager-leave-requests`
                    sendEmailNotifications(managerEmail,subject, text, link)
                }else{
                    res.status(404).send({message: 'Manager not found for the leave request'})
                }
            })
        }
        if(action === 'reject'){
            const fetchEmployeeManagerQuery=`
                SELECT e.first_name AS employee_first_name, e.last_name AS employee_last_name, e.email AS employee_email
                FROM leave_requests lr
                JOIN employee e ON lr.employee_id = e.id
                WHERE lr.id=?
            `;
            db.query(fetchEmployeeManagerQuery, [requestId], (err, results) => {
                if(err){
                    console.error('Error fetching employee details:', err)
                    return res.status(500).send(err)
                }
                if(results.length > 0){
                    const employeeName = `${results[0].employee_first_name} ${results[0].employee_last_name}`
                    const employeeEmail = results[0].employee_email

                    const subject = 'Leave Request Rejected'
                    const text = `Dear ${employeeName}, \n\nYour leave request has been rejected.\n\nPlease contact your first approver for more details.\n\nBest regards`
                    const link = `http://custom-application:3000/leave-requests`
                    sendEmailNotifications(employeeEmail,subject, text, link)
                }else{
                    res.status(404).send({message: 'Manager not found for the leave request'})
                }
            })
        }
        
        res.send({ message: `Leave request ${action}ed` });
    });
});


app.get('/previous-unpaid-leave-days/:employeeId', authenticateToken, (req, res) => {
    const employeeId = req.params.employeeId;
    const currentYear = new Date().getFullYear();

    const query = `
        SELECT SUM(quantity) as total
        FROM leave_requests
        WHERE employee_id = ? AND YEAR(leave_requests.start_date) = ? AND YEAR(leave_requests.end_date) = ? AND type_of_leave = 'Unpaid Leave' AND request_status NOT IN ('Cancelled', 'Rejected')
    `;

    db.query(query, [employeeId, currentYear, currentYear], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send(err);
        }
        const totalUnpaidLeaveDays = results[0].total || 0;
        res.send({ total: totalUnpaidLeaveDays });
    });
});


app.patch('/holidays/:id', hrAuthenticateToken, async (req, res) => {
    const id = req.params.id;
    const { startDate, endDate, description } = req.body;
    const hrUserId = getIdFromToken(req);  // Get HR user ID from token
    const formattedStartDate = moment(startDate).format('YYYY-MM-DD');
    const formattedEndDate = moment(endDate).format('YYYY-MM-DD');

    const updateHolidayQuery = `
        UPDATE holidays
        SET start_date = ?, end_date = ?, description = ?
        WHERE id = ?
    `;

    db.query(updateHolidayQuery, [formattedStartDate, formattedEndDate, description, id], (err, result) => {
        if (err) {
            console.error('Error updating holiday:', err);
            return res.status(500).send(err);
        }

        addLog(hrUserId, 'Edit Holiday', `Edited holiday ${id}: ${formattedStartDate} to ${formattedEndDate}, description: ${description}`);

        const findLeaveRequestsQuery = `
            SELECT lr.id, lr.employee_id, lr.type_of_leave, lr.quantity, lrd.duration, lrd.leave_date, lr.request_status
            FROM leave_requests lr
            JOIN leave_request_dates lrd ON lr.id = lrd.leave_request_id
            WHERE lrd.leave_date BETWEEN ? AND ?
            AND lr.request_status IN ('Approved', 'Pending Manager', 'Pending First Approval', 'Cancel Requested')
        `;

        db.query(findLeaveRequestsQuery, [formattedStartDate, formattedEndDate], (err, leaveRequests) => {
            if (err) {
                console.error('Error finding leave requests:', err);
                return res.status(500).send(err);
            }

            const updateRequests = leaveRequests.map(request => {
                return new Promise((resolve, reject) => {
                    db.query(`UPDATE leave_requests SET request_status = 'Cancelled' WHERE id = ?`, [request.id], (err, result) => {
                        if (err) {
                            console.error('Error updating leave request status:', err);
                            return reject(err);
                        }

                        if ((request.type_of_leave === 'Annual Paid Leave' || request.type_of_leave === 'Unpaid Leave') && request.request_status === 'Approved') {
                            db.query(`
                                UPDATE employee
                                SET days = days + ?
                                WHERE id = ?
                            `, [request.duration, request.employee_id], (err, result) => {
                                if (err) {
                                    console.error('Error updating employee days:', err);
                                    return reject(err);
                                }
                                resolve();
                            });
                        } else {
                            resolve();
                        }
                    });
                });
            });

            Promise.all(updateRequests)
                .then(() => res.send({ message: 'Holiday updated and overlapping leave requests cancelled successfully' }))
                .catch(err => {
                    console.error('Error updating leave requests:', err);
                    res.status(500).send(err);
                });
        });
    });
});



const addLog = (hrUserId, action, details) => {
    const getUserInfoQuery = 'SELECT first_name, last_name FROM employee WHERE id = ?';
    db.query(getUserInfoQuery, [hrUserId], (err, results) => {

        if (results.length === 0) {
            console.log('HR user not found');
            return;
        }
        
        if (err) {
            console.error('Error fetching HR user info:', err);
            return;
        }
        
        if (results.length > 0) {
            const hrUser = results[0];
            const hrUserName = `${hrUser.first_name} ${hrUser.last_name}`;

            const insertLogQuery = `
                INSERT INTO logs (hr_user, hr_user_name, action, details)
                VALUES (?, ?, ?, ?)
            `;
            
            db.query(insertLogQuery, [hrUserId, hrUserName, action, details], (err, result) => {
                if (err) {
                    console.error('Error logging action:', err);
                    return;
                }
            });
        } else {
            console.log('HR user not found');
        }
    });
};

const addbankLog = (userId, action, details) => {
    const getUserInfoQuery = 'SELECT first_name, last_name FROM employee WHERE id = ?';
    
    db.query(getUserInfoQuery, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching HR user info:', err);
            return;
        }

        if (results.length === 0) {
            console.log('HR user not found');
            return;
        }

        const user = results[0];
        const userName = `${user.first_name} ${user.last_name}`;

        const insertbankLogQuery = `
            INSERT INTO bank_logs (user, user_name, action, details)
            VALUES (?, ?, ?, ?)
        `;
        
        db.query(insertbankLogQuery, [userId, userName, action, details], (err, result) => {
            if (err) {
                console.error('Error logging action in bank_logs:', err);
                return;
            }
        });
    });
};


app.get('/logs', (req, res) => {
    const query = `
        SELECT l.id, l.hr_user_name as "hr_user_name", l.action, l.details, l.timestamp
        FROM logs l
        ORDER BY l.timestamp DESC
    `;
    db.query(query, (err, result) => {
        if (err) res.send(err);
        else res.send(result);
    });
});
app.get('/manager-leave-requests', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
                    SELECT 
                        lr.id,
                        lr.employee_id AS employeeId, 
                        CONCAT(e.first_name, ' ', e.last_name) AS name,
                        lr.type_of_leave AS typeOfLeave, 
                        lr.request_status AS requestStatus, 
                        lr.attachment,
                        SUM(ld.duration) AS quantity,
                        CASE 
                            WHEN lr.type_of_leave IN ('Maternity', 'Paternity', 'Marital') 
                            THEN CONCAT(lr.start_date, ' -> ', lr.end_date)
                            ELSE GROUP_CONCAT(ld.leave_date)
                        END AS dates,
                        GROUP_CONCAT(
                            CASE 
                                WHEN lr.type_of_leave = 'Personal Time Off' THEN CONCAT(DATE_FORMAT(ld.start_time, '%H:%i'), ' -> ', DATE_FORMAT(ld.end_time, '%H:%i'))
                                WHEN ld.duration = 0.5 THEN ld.time
                                ELSE 'N/A'
                            END
                        ) AS time,
                        lr.last_modified AS lastModified 
                    FROM leave_requests lr
                    JOIN employee e ON lr.employee_id = e.id
                    LEFT JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
                    JOIN employee m ON e.manager_id = m.id
                    WHERE m.id = ?
                    AND lr.request_status IN ('Approved', 'Pending Manager', 'HR Remove', 'Cancel Requested - Pending Manager')
                    GROUP BY lr.id
                    ORDER BY lastModified DESC
    `;
    db.query(query, [userId], (err, result) => {
        if (err) res.send(err);
        else res.send(result);
    });
});

app.post('/leave-requests/hr', authenticateToken, (req, res) => {
    const { employeeId, action, reason, leaveDetails, typeOfLeave, quantity} = req.body;
    const hrUserId = getIdFromToken(req); // Get HR user ID from token
    if(action){
        let totalAmount = 0;
        leaveDetails.forEach(detail => {
            const { duration } = detail;
            totalAmount += Number(duration);
        });
    
        const typeOfReason = reason;
        const requestStatus = action === 'Add' ? 'HR Add' : 'HR Remove';
    
        const startDate = leaveDetails[0].date;
        const endDate = leaveDetails[leaveDetails.length - 1].date;
    
        const employeeQuery = `SELECT e.first_name, e.last_name, e.email, m.first_name as manager_first_name, m.last_name as manager_last_name, m.email as manager_email FROM employee e LEFT JOIN employee m ON e.manager_id = m.id WHERE e.id = ?`;
    
        db.query(employeeQuery, [employeeId], (err, employeeResult) => {
            if (err) {
                console.error('Error fetching employee details:', err);
                return res.status(500).send(err);
            }
    
            if (employeeResult.length === 0) {
                return res.status(404).send({ message: 'Employee not found' });
            }
    
            const employeeName = `${employeeResult[0].first_name} ${employeeResult[0].last_name}`;
            const employeeEmail = employeeResult[0].email
            const managerName = `${employeeResult[0].manager_first_name} ${employeeResult[0].manager_last_name}`;
            const managerEmail = employeeResult[0].manager_email
            const query = `
                INSERT INTO leave_requests (employee_id, type_of_leave, request_status, quantity, start_date, end_date, last_modified)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
    
            db.query(query, [employeeId, typeOfReason, requestStatus, totalAmount, startDate, endDate], (err, result) => {
                if (err) {
                    console.error('Error adding leave request:', err);
                    return res.status(500).send(err);
                }
    
                const leaveRequestId = result.insertId;
                const dateQueries = leaveDetails.map(detail => (
                    new Promise((resolve, reject) => {
                        const dateQuery = `
                            INSERT INTO leave_request_dates (leave_request_id, leave_date, duration, time)
                            VALUES (?, ?, ?, ?)
                        `;
                        db.query(dateQuery, [leaveRequestId, detail.date, detail.duration, detail.time], (err, dateResult) => {
                            if (err) reject(err);
                            else resolve(dateResult);
                        });
                    })
                ));
    
                Promise.all(dateQueries)
                    .then(() => {
                        const updateDaysQuery = action === 'Add'
                            ? 'UPDATE employee SET days = days + ? WHERE id = ?'
                            : 'UPDATE employee SET days = days - ? WHERE id = ?';
    
                        db.query(updateDaysQuery, [totalAmount, employeeId], (err, updateResult) => {
                            if (err) {
                                console.error('Error updating employee days:', err);
                                return res.status(500).send(err);
                            } else {
                                const logAction = action === 'Add' ? 'Add Days' : 'Remove Days';
                                const firstText = action === 'Add' ? `Added ${totalAmount} to your balance` : `Removed ${totalAmount} from your balance`
                                addLog(hrUserId, logAction, `${logAction} for employee: ${employeeName}, Amount: ${totalAmount}`);
                                const link = `http://custom-application:3000/leave-summary`
                                const text = `Dear ${employeeName}, \n\n${firstText} for the following reason: ${typeOfReason}.\n\nPlease contact HR for more details`
                                if(action === 'Remove'){
                                    const managerText = `Dear ${managerName}, \n\nHR removed ${totalAmount} from ${employeeName}'s balance for the following reason: ${typeOfReason}.\n\nContact HR for more details.`
                                    sendEmailNotifications(managerEmail,logAction, managerText, link)
                                }
                                sendEmailNotifications(employeeEmail,logAction, text, link)
                                res.send({ message: 'Leave request added successfully and days updated' });
                            }
                        });
                    })
                    .catch(err => {
                        console.error('Error adding leave request dates:', err);
                        res.status(500).send(err);
                    });
            });
        });
    }
    if(typeOfLeave){
        insertLeaveRequest()
    }
    function insertLeaveRequest() {
        // Calculate start date, end date, and quantity based on the leave type
        let startDate = leaveDetails.sort((a, b) => new Date(a.date) - new Date(b.date))[0].date;
        let endDate;
        let calculatedQuantity;
        const requestStatuss = 'Approved'

        if (typeOfLeave === 'Marital') {
            calculatedQuantity = 7.0;
            endDate = moment(startDate).add(6, 'days').format('YYYY-MM-DD');
        } else if (typeOfLeave === 'Maternity') {
            calculatedQuantity = 70.0;
            endDate = moment(startDate).add(69, 'days').format('YYYY-MM-DD');
        } else if (typeOfLeave === 'Paternity') {
            calculatedQuantity = 3.0;
            endDate = moment(startDate).add(2, 'days').format('YYYY-MM-DD');
        } else {
            calculatedQuantity = quantity;
            endDate = leaveDetails[leaveDetails.length - 1].date;
        }

        const query = `
            INSERT INTO leave_requests (employee_id, type_of_leave, request_status, quantity, start_date, end_date, last_modified)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;

        db.query(query, [employeeId, typeOfLeave, requestStatuss, calculatedQuantity, startDate, endDate], (err, result) => {
            if (err) {
                console.error('Error adding leave request:', err);
                return res.status(500).send(err);
            }

            const leaveRequestId = result.insertId;
            let dateRange = [];

            if (typeOfLeave === 'Marital') {
                dateRange = Array.from({ length: 7 }, (_, i) => moment(startDate).add(i, 'days').format('YYYY-MM-DD'));
            } else if (typeOfLeave === 'Maternity') {
                dateRange = Array.from({ length: 70 }, (_, i) => moment(startDate).add(i, 'days').format('YYYY-MM-DD'));
            } else if (typeOfLeave === 'Paternity') {
                dateRange = Array.from({ length: 3 }, (_, i) => moment(startDate).add(i, 'days').format('YYYY-MM-DD'));
            } else {
                // For other types, use the dates provided in leaveDetails
                dateRange = leaveDetails.map(detail => detail.date);
            }

            // Insert each date from the dateRange into the leave_request_dates table
            const dateQueries = dateRange.map(date => (
                new Promise((resolve, reject) => {
                    const dateQuery = `
                        INSERT INTO leave_request_dates (leave_request_id, leave_date, duration, start_time, end_time, time)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    const detail = leaveDetails.find(detail => detail.date === date) || {}; // Find matching detail or default to empty
                    const duration = detail.duration || '1.0'; // Default to full day if not specified
                    const time = detail.time || 'N/A';
                    const startTime = detail.start_time || null;
                    const endTime = detail.end_time || null;

                    db.query(dateQuery, [leaveRequestId, date, duration, startTime, endTime, time], (err, dateResult) => {
                        if (err) reject(err);
                        else resolve(dateResult);
                    });
                })
            ));

            Promise.all(dateQueries)
                .then(() => {
                    const employeeQuery = `SELECT e.first_name, e.last_name, e.email, m.first_name as manager_first_name, m.last_name as manager_last_name, m.email as manager_email FROM employee e LEFT JOIN employee m ON e.manager_id = m.id WHERE e.id = ?`;
    
                    db.query(employeeQuery, [employeeId], (err, employeeResult) => {
                        if (err) {
                            console.error('Error fetching employee details:', err);
                            return res.status(500).send(err);
                        }
                
                        if (employeeResult.length === 0) {
                            return res.status(404).send({ message: 'Employee not found' });
                        }
                
                        const employeeName = `${employeeResult[0].first_name} ${employeeResult[0].last_name}`;
                        const employeeEmail = employeeResult[0].email
                        const managerName = `${employeeResult[0].manager_first_name} ${employeeResult[0].manager_last_name}`;
                        const managerEmail = employeeResult[0].manager_email
                        const link = `http://custom-application:3000/manager-leave-requests`
                        const subject = `${typeOfLeave} Leave`
                        const text = `Dear ${managerName}, \n\n${employeeName} will go on ${typeOfLeave} leave. \n\nPlease review your manager leave request table or contact HR for more details.`
    
                        sendEmailNotifications(managerEmail,subject, text, link)

                        res.send({ message: 'Leave request added successfully'});
                    })
                })
                .catch(err => {
                    console.error('Error adding leave request dates:', err);
                    res.status(500).send(err);
                });
        });
    }
});
app.get('/leave-requests/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    // console.log('Fetching leave requests for employee:', id);

    const query = `
        SELECT 
            lr.id,
            lr.employee_id AS employeeId, 
            CONCAT(e.first_name, ' ', e.last_name) AS name,
            lr.type_of_leave AS typeOfLeave, 
            lr.request_status AS requestStatus, 
            lr.quantity,
            CASE 
                WHEN lr.type_of_leave IN ('Maternity', 'Paternity', 'Marital') 
                THEN CONCAT(lr.start_date, ' -> ', lr.end_date)
                ELSE GROUP_CONCAT(ld.leave_date)
            END AS dates, -- Conditionally formatted dates field
            GROUP_CONCAT(
                CASE 
                    WHEN lr.type_of_leave = 'Personal Time Off' THEN CONCAT(DATE_FORMAT(ld.start_time, '%H:%i'), ' -> ',DATE_FORMAT(ld.end_time, '%H:%i'))
                    WHEN ld.duration = 0.5 THEN ld.time
                    ELSE 'N/A'
                END
            ) AS time,
            lr.attachment,
            lr.last_modified AS lastModified
        FROM leave_requests lr
        JOIN employee e ON lr.employee_id = e.id
        LEFT JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
        WHERE lr.employee_id = ?
        GROUP BY lr.id
        ORDER BY lr.last_modified DESC
    `;

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error fetching leave requests:', err);
            return res.status(500).send(err);
        }
        
        res.send(result);
    });
});


app.get('/fetch-team',(req, res) => {
    const managerId = req.query.manager_id;
    if (!managerId) {
        return res.status(400).json({ error: "Manager ID is required" });
    }
    const query = `
        SELECT 
        e.id, 
        e.first_name,
        e.last_name,
        CONCAT(e.first_name, ' ',e.last_name) AS full_name,
        e.email, 
        e.days,
        d.name AS "department_name", 
        e.manager_id, 
        CONCAT(me.first_name, ' ', me.last_name) AS manager_full_name,  
        e.birthday, 
        e.start_date, 
        e.end_date, 
        l.location_name,
        e.first_approver_id,
        CONCAT(fe.first_name, ' ', fe.last_name) AS first_approver_full_name,
        COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Annual Paid Leave')) THEN ld.duration ELSE 0 END), 0) AS paid_leaves_taken,
        COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Sick Leave With Medical Report')) THEN ld.duration ELSE 0 END), 0) AS sick_leaves_with_medical_report_taken,
        COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Sick Leave Allowed')) THEN ld.duration ELSE 0 END), 0) AS sick_leaves_allowed_taken,
        COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Compassionate')) THEN ld.duration ELSE 0 END), 0) AS compassionate_taken,
        COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Unpaid Leave')) THEN ld.duration ELSE 0 END), 0) AS unpaid_leave_taken,
        COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Marital')) THEN ld.duration ELSE 0 END), 0) AS marital_taken,
        COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Maternity')) THEN ld.duration ELSE 0 END), 0) AS maternity_taken,
        COALESCE(SUM(CASE WHEN (YEAR(ld.leave_date) = YEAR(CURDATE()) AND (lr.request_status IN('Approved', 'HR Remove')  AND lr.type_of_leave = 'Paternity')) THEN ld.duration ELSE 0 END), 0) AS paternity_taken
        FROM employee e
        LEFT JOIN department d ON e.department_id = d.id
        LEFT JOIN employee me ON e.manager_id = me.id
        LEFT JOIN employee fe ON e.first_approver_id = fe.id
        LEFT JOIN location l ON e.location_id = l.id
        LEFT JOIN leave_requests lr ON e.id = lr.employee_id
        LEFT JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
        WHERE e.manager_id = ?
        GROUP BY e.id
    `;

    db.query(query, [managerId], async (err, result) => {
        if (err) return res.status(500).send(err);

        const employeesWithLeaveDays = await Promise.all(result.map(async (employee) => {
            const leaveDaysOnJan1 = await calculateLeaveDaysForEmployeeOnJan1(employee);
            return { ...employee, leave_days_on_jan_1: leaveDaysOnJan1 };
        }));

        res.json(employeesWithLeaveDays);
    });
});



app.get('/employee/:id/leave-summary', (req, res) => {
    const employeeId = req.params.id;

    const query = `
        SELECT ld.leave_date AS date,
               SUM(ld.duration) AS net_amount,
               lr.type_of_leave AS leave_type,
               lr.request_status AS request_status,
               GROUP_CONCAT(CONCAT(ld.start_time, ' - ', ld.end_time)) AS time_intervals
        FROM leave_requests lr
        JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
        WHERE lr.employee_id = ? 
          AND (lr.request_status = 'Approved'
          OR lr.request_status = 'HR Remove')
        GROUP BY ld.leave_date, lr.type_of_leave, lr.request_status
        ORDER BY ld.leave_date;
    `;

    db.query(query, [employeeId], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send(err);
        } else {
            // Calculate total minutes for PTO
            results.forEach(result => {
                if (result.leave_type === 'Personal Time Off' && result.time_intervals) {
                    const timeIntervals = result.time_intervals.split(',');
                    let totalMinutes = 0;

                    timeIntervals.forEach(interval => {
                        const [startTime, endTime] = interval.split(' - ');
                        const start = moment(startTime, 'HH:mm');
                        const end = moment(endTime, 'HH:mm');
                        totalMinutes += end.diff(start, 'minutes');
                    });

                    result.net_amount = totalMinutes / 60; // Convert minutes to hours
                }
            });

            res.send(results);
        }
    });
});

app.patch('/leave-requests/:id/cancel', authenticateToken, (req, res) => {
    const id = req.params.id;  // Leave request ID

    // Step 1: Fetch leave request and associated employee info
    const fetchQuery = `
        SELECT lr.employee_id, lr.request_status
        FROM leave_requests lr
        WHERE lr.id = ? AND (lr.request_status = 'Pending Manager' OR lr.request_status = 'Approved' OR lr.request_status = 'Pending First Approval')
    `;
    db.query(fetchQuery, [id], (err, result) => {
        if (err) {
            console.error('Error fetching leave request:', err);
            return res.status(500).send(err);
        }
        if (result.length === 0) {
            return res.status(404).send({ message: 'Leave request not found or already processed' });
        }
        
        const employeeId = result[0].employee_id; 
        const requestStatus = result[0].request_status;
        let updateRequestQuery;

        // Step 2: Handle leave request cancellation or update based on request status
        if (requestStatus === 'Pending First Approval' || requestStatus === 'Pending Manager') {
            updateRequestQuery = `
                UPDATE leave_requests 
                SET request_status = 'Cancelled', last_modified = NOW() 
                WHERE id = ? AND (request_status = 'Pending First Approval' OR request_status = 'Pending Manager')
            `;
            db.query(updateRequestQuery, [id], (err, updateResult) => {
                if (err) {
                    console.error('Error updating leave request:', err);
                    return res.status(500).send(err);
                }
                res.send({ message: 'Leave request cancelled successfully' });
            });

        } else if (requestStatus === 'Approved') {
            // Step 3: Get employee details (first approver and manager info)
            const getEmployeeDetailsQuery = `
                SELECT first_approver_id, manager_id, first_name, last_name, email 
                FROM employee 
                WHERE id = ?
            `;
            
            db.query(getEmployeeDetailsQuery, [employeeId], (err, results) => {
                if (err) {
                    console.error('Error fetching recipient to send cancel request to: ', err);
                    return res.status(500).send(err);
                }

                if (!results || results.length === 0) {
                    return res.status(404).send({ message: 'No employee found for the leave request' });
                }

                const firstApproverId = results[0]?.first_approver_id;
                const managerId = results[0]?.manager_id;

                // Step 4: Check if there's a first approver
                if (firstApproverId) {
                    updateRequestQuery = `
                        UPDATE leave_requests 
                        SET request_status = 'Cancel Requested - Pending First Approval', last_modified = NOW() 
                        WHERE id = ? AND request_status = 'Approved'
                    `;
                    db.query(updateRequestQuery, [id], (err, updateResult) => {
                        if (err) {
                            console.error('Error updating leave request:', err);
                            return res.status(500).send(err);
                        }

                        // Fetch first approver details
                        const firstApproverInfoQuery = `
                            SELECT email, first_name FROM employee WHERE id = ?
                        `;
                        db.query(firstApproverInfoQuery, [firstApproverId], (error1, FAresults) => {
                            if (error1) {
                                console.error('Error getting first approver information:', error1);
                                return res.status(500).send(error1);
                            }

                            if (!FAresults || FAresults.length === 0) {
                                return res.status(404).send({ message: 'First approver not found' });
                            }

                            const employeeName = `${results[0].first_name} ${results[0].last_name}`;
                            const firstApproverEmail = FAresults[0].email;
                            const subject = 'New Leave Cancel Request Pending Approval';
                            const text = `Dear ${FAresults[0].first_name},\n\nA new leave cancel request for ${employeeName} is pending your approval.\n\nBest regards.`;
                            const link = `http://custom-application:3000/first-approval-requests`;

                            sendEmailNotifications(firstApproverEmail, subject, text, link);
                            res.send({ message: 'Leave cancel request submitted to first approver' });
                        });
                    });
                } else {
                    // Step 5: If no first approver, send the cancel request to the manager
                    updateRequestQuery = `
                        UPDATE leave_requests 
                        SET request_status = 'Cancel Requested - Pending Manager', last_modified = NOW() 
                        WHERE id = ? AND request_status = 'Approved'
                    `;
                    db.query(updateRequestQuery, [id], (err, updateResult) => {
                        if (err) {
                            console.error('Error updating leave request:', err);
                            return res.status(500).send(err);
                        }

                        // Fetch manager details
                        const managerInfoQuery = `
                            SELECT email, first_name FROM employee WHERE id = ?
                        `;
                        db.query(managerInfoQuery, [managerId], (error2, Mresults) => {
                            if (error2) {
                                console.error('Error getting manager information:', error2);
                                return res.status(500).send(error2);
                            }

                            if (!Mresults || Mresults.length === 0) {
                                return res.status(404).send({ message: 'Manager not found' });
                            }

                            const employeeName = `${results[0].first_name} ${results[0].last_name}`;
                            const managerEmail = Mresults[0].email;
                            const subject = 'New Leave Cancel Request Pending Approval';
                            const text = `Dear ${Mresults[0].first_name},\n\nA new leave cancel request for ${employeeName} is pending your approval.\n\nBest regards.`;
                            const link = `http://custom-application:3000/manager-leave-requests`;

                            sendEmailNotifications(managerEmail, subject, text, link);
                            res.send({ message: 'Leave cancel request submitted to manager' });
                        });
                    });
                }
            });
        }
    });
});



app.patch('/leave-requests/:id/approve', authenticateToken, (req, res) => {
    const id = req.params.id;
    
    const fetchQuery = `
        SELECT lr.employee_id, lr.type_of_leave, SUM(ld.duration) as quantity, GROUP_CONCAT(ld.leave_date) AS dates,
        e.first_name as employee_first_name, e.last_name as employee_last_name, e.email as employee_email, e.department_id as employee_department_id
        FROM leave_requests lr
        JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
        JOIN employee e ON lr.employee_id = e.id
        JOIN department d ON e.department_id = d.id
        WHERE lr.id = ? AND lr.request_status = 'Pending Manager'
        GROUP BY lr.id
    `;
    db.query(fetchQuery, [id], (err, result) => {
        if (err) {
            console.error('Error fetching leave request:', err);
            res.status(500).send(err);
        } else if (result.length === 0) {
            res.status(404).send({ message: 'Leave request not found or already processed' });
        } else {
            const { employee_id, type_of_leave, quantity, dates, employee_first_name, employee_last_name, employee_email, employee_department_id, department_name } = result[0];
            const employeeName = `${employee_first_name} ${employee_last_name}`;
            const employeeEmail = `${employee_email}`;
            const hrEmail = 'leaverequest@gmail.com'; // HR email
            const subject = 'New Leave Request Pending HR Approval';
            const text = `Dear HR, \n\nA new leave request for ${employeeName} is pending your approval.\n\nBest regards.`;
            const link = `http://custom-application:3000/hr-leave-requests`;  // Add a link to the HR dashboard if needed.

            // Send an email to HR notifying them of the new leave request.
            sendEmailNotifications(hrEmail, subject, text, link);

            // Update the request status to "Pending HR" regardless of the leave type
            const updateRequestQuery = `
                UPDATE leave_requests 
                SET request_status = 'Pending HR', last_modified = NOW() 
                WHERE id = ? AND request_status = 'Pending Manager'
            `;
            db.query(updateRequestQuery, [id], (err, updateResult) => {
                if (err) {
                    console.error('Error updating leave request status:', err);
                    res.status(500).send(err);
                } else {
                    res.send({ message: 'Leave request is now pending HR approval' });
                }
            });
        }
    });
});



app.patch('/leave-requests/:id/hr-approve', hrAuthenticateToken, (req, res) => {
    const id = req.params.id;
    const action = req.body.action; // 'approve' or 'reject'
    const approvedDays = parseFloat(req.body.approvedDays); // The number of days HR wants to approve
    console.log("Approved days: " + approvedDays);

    let newStatus;
    if (action === 'approve') {
        newStatus = 'Approved';
    } else if (action === 'reject') {
        newStatus = 'Rejected';
    } else {
        return res.status(400).send({ message: 'Invalid action' });
    }

    const fetchQuery = `
        SELECT lr.employee_id, lr.type_of_leave, e.manager_id, e.email AS employee_email, e.first_name AS employee_first_name, e.last_name AS employee_last_name, e.on_behalf,
            m.email AS manager_email, m.first_name AS manager_first_name, m.last_name AS manager_last_name,
            fa.email AS first_approver_email, fa.first_name AS first_approver_first_name, fa.last_name AS first_approver_last_name,
            SUM(ld.duration) as quantity, GROUP_CONCAT(ld.leave_date ORDER BY ld.leave_date ASC) as leave_dates
        FROM leave_requests lr
        JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
        JOIN employee e ON lr.employee_id = e.id
        LEFT JOIN employee m ON e.manager_id = m.id 
        LEFT JOIN employee fa ON e.first_approver_id = fa.id
        WHERE lr.id = ? AND lr.request_status = 'Pending HR'
        GROUP BY lr.id;
    `;

    db.query(fetchQuery, [id], (err, results) => {
        if (err) {
            console.error('Error fetching leave request:', err);
            return res.status(500).send(err);
        }

        if (results.length === 0) {
            return res.status(404).send({ message: 'Leave request not found or already processed' });
        }

        const { employee_id, employee_email, employee_first_name, employee_last_name, manager_email, manager_first_name, manager_last_name, first_approver_email, first_approver_first_name, first_approver_last_name, on_behalf, type_of_leave, quantity, leave_dates } = results[0];


        // Check if rejecting the request
        if (newStatus === 'Rejected') {
            // Simply update the request status to "Rejected"
            const updateRequestQuery = `
                UPDATE leave_requests 
                SET request_status = ?, last_modified = NOW() 
                WHERE id = ? AND request_status = 'Pending HR'
            `;
            db.query(updateRequestQuery, [newStatus, id], (err, updateResult) => {
                if (err) {
                    console.error('Error rejecting leave request:', err);
                    return res.status(500).send(err);
                }
                
                if(on_behalf){
                    if(first_approver_email){
                        const first_approver_rejectionText = `Dear ${first_approver_first_name} ${first_approver_last_name},\n\n${employee_first_name} ${employee_last_name}\'s leave request has been rejected by HR.\n\nBest Regards`;
                        const link = 'http://custom-application:3000/login';
                        sendEmailNotifications(first_approver_email, 'Leave Request Rejected For Employee Without Email', first_approver_rejectionText, link);
                    }
                    if(manager_email){
                        const manager_rejectionText = `Dear ${manager_first_name} ${manager_last_name},\n\n${employee_first_name} ${employee_last_name}\'s leave request has been rejected by HR.\n\nBest Regards`;
                        const link = 'http://custom-application:3000/login';
                        sendEmailNotifications(manager_email, 'Leave Request Rejected For Employee Without Email', manager_rejectionText, link);
                    }
                    res.send({ message: 'Leave request rejected and email sent' });
                    return;
                }
                const rejectionText = `Dear ${employee_first_name} ${employee_last_name},
                Your leave request has been rejected. Please contact HR for more details.
                Best Regards`;
                const link = 'http://custom-application:3000/leave-requests';
                sendEmailNotifications(employee_email, 'Leave Request Rejected', rejectionText, link);
                
                res.send({ message: 'Leave request rejected and email sent' });
            });
            return; // Exit here for "Reject" action
        }



        // Check if approvedDays exceeds quantity
        if (approvedDays > quantity) {
            return res.status(400).send({ message: 'Approved days cannot exceed the requested quantity' });
        }

        if (type_of_leave === "Personal Time Off") {
            // Full approval or rejection only
            if (action === "approve") {
                newStatus = "Approved";
                
                const updateRequestQuery = `
                    UPDATE leave_requests 
                    SET request_status = ?, last_modified = NOW() 
                    WHERE id = ? AND request_status = 'Pending HR'
                `;
                
                db.query(updateRequestQuery, [newStatus, id], (err, updateResult) => {
                    if (err) {
                        console.error("Error approving leave request:", err);
                        return res.status(500).send(err);
                    }
                    
                    const link = "http://custom-application:3000/leave-requests";
                    
                    // Send approval email
                    if (on_behalf) {
                        if (first_approver_email) {
                            sendEmailNotifications(first_approver_email, 
                                "Leave Request Fully Approved", 
                                `Dear ${first_approver_first_name} ${first_approver_last_name},\n\n${employee_first_name} ${employee_last_name}'s Personal Time Off request has been fully approved by HR.\n\nBest Regards`, link);
                        }
                        if (manager_email) {
                            sendEmailNotifications(manager_email, 
                                "Leave Request Fully Approved", 
                                `Dear ${manager_first_name} ${manager_last_name},\n\n${employee_first_name} ${employee_last_name}'s Personal Time Off request has been fully approved by HR.\n\nBest Regards`, link);
                        }
                    } else {
                        sendEmailNotifications(employee_email, 
                            "Leave Request Fully Approved", 
                            `Dear ${employee_first_name} ${employee_last_name},\n\nYour Personal Time Off request has been fully approved.\n\nBest regards`, link);
                    }
                    
                    res.send({ message: "Personal Time Off request fully approved and email sent" });
                });
            } 
            return; // Exit since PTO does not require further processing
        }

        // if (type_of_leave === "Sick Leave Allowed" || type_of_leave === "Sick Leave With Medical Report") {
        //     // Full approval or rejection only
        //     if (action === "approve") {
        //         newStatus = "Approved";
                
        //         const updateRequestQuery = `
        //             UPDATE leave_requests 
        //             SET request_status = ?, last_modified = NOW() 
        //             WHERE id = ? AND request_status = 'Pending HR'
        //         `;
                
        //         db.query(updateRequestQuery, [newStatus, id], (err, updateResult) => {
        //             if (err) {
        //                 console.error("Error approving leave request:", err);
        //                 return res.status(500).send(err);
        //             }
                    
        //             const link = "http://custom-application:3000/leave-requests";
                    
        //             // Send approval email
        //             if (on_behalf) {
        //                 if (first_approver_email) {
        //                     sendEmailNotifications(first_approver_email, 
        //                         "Leave Request Fully Approved", 
        //                         `Dear ${first_approver_first_name} ${first_approver_last_name},\n\n${employee_first_name} ${employee_last_name}'s Sick leave request has been fully approved by HR.\n\nBest Regards`, link);
        //                 }
        //                 if (manager_email) {
        //                     sendEmailNotifications(manager_email, 
        //                         "Leave Request Fully Approved", 
        //                         `Dear ${manager_first_name} ${manager_last_name},\n\n${employee_first_name} ${employee_last_name}'s Sick leave request has been fully approved by HR.\n\nBest Regards`, link);
        //                 }
        //             } else {
        //                 sendEmailNotifications(employee_email, 
        //                     "Leave Request Fully Approved", 
        //                     `Dear ${employee_first_name} ${employee_last_name},\n\nYour Sick leave request has been fully approved.\n\nBest regards`, link);
        //             }
                    
        //             res.send({ message: "Allowed sick leave request fully approved and email sent" });
        //         });
        //     } 
        //     return;
        // }

        
        const leaveDatesArray = leave_dates.split(',');
        let approvedDates = [];
        let unapprovedDates = leaveDatesArray;

        // If approvedDays > 0, calculate approved and unapproved dates
        if (approvedDays > 0) {
            let totalApproved = 0.0;
            for (let i = 0; i < leaveDatesArray.length; i++) {
                if (totalApproved < approvedDays) {
                    approvedDates.push(leaveDatesArray[i]);
                    totalApproved += 1; 
                }
            }

            // Calculate unapproved dates
            unapprovedDates = leaveDatesArray.filter(date => !approvedDates.includes(date));
        }

        // Update leave request as approved with the correct quantity
        const updateRequestQuery = `
            UPDATE leave_requests 
            SET request_status = ?, quantity = ?, last_modified = NOW() 
            WHERE id = ? AND request_status = 'Pending HR'
        `;

        db.query(updateRequestQuery, [newStatus, approvedDays, id], (err, updateResult) => {
            if (err) {
                console.error('Error approving leave request:', err);
                return res.status(500).send(err);
            }

            const link = 'http://custom-application:3000/leave-requests';

            // If there are unapproved dates, handle converting them to Forced Leave
            if (unapprovedDates.length > 0) {
                // Calculate the quantity of unapproved days
                const unapprovedDays = quantity - approvedDays;

                // Delete unapproved dates from the original leave request
                const deleteUnapprovedDatesQuery = `
                    DELETE FROM leave_request_dates 
                    WHERE leave_request_id = ? AND leave_date IN (?)
                `;
                
                db.query(deleteUnapprovedDatesQuery, [id, unapprovedDates], (err, deleteResult) => {
                    if (err) {
                        console.error('Error deleting unapproved dates:', err);
                        return res.status(500).send(err);
                    }

                    // Deduct approved days from the employee's balance
                    if (type_of_leave !== "Sick Leave Allowed" && type_of_leave !== "Sick Leave With Medical Report") { 
                        const deductApprovedDaysQuery = `
                            UPDATE employee 
                            SET days = days - ? 
                            WHERE id = ?
                        `;
                    
                        db.query(deductApprovedDaysQuery, [approvedDays, employee_id], (err, deductResult) => {
                            if (err) {
                                console.error('Error deducting approved days from employee balance:', err);
                                return res.status(500).send(err);
                            }
                            console.log(`Deducted ${approvedDays} days from employee ${employee_id}`);
                        });
                    } else {
                        console.log("Skipping balance deduction for Sick Leave Allowed");
                    }
                    
                    console.log(`Approved days: ${approvedDays}`);
                    console.log(`Employee ID: ${employee_id}`);

                        // Insert a new "Forced Leave" request for the unapproved dates
                        const insertForcedLeaveQuery = `
                            INSERT INTO leave_requests (employee_id, type_of_leave, request_status, quantity, start_date, end_date, last_modified)
                            VALUES (?, 'Unapproved Days', 'Rejected By HR', ?, ?, ?, NOW())
                        `;
                        const startDate = unapprovedDates[0];
                        const endDate = unapprovedDates[unapprovedDates.length - 1];

                        db.query(insertForcedLeaveQuery, [employee_id, unapprovedDays, startDate, endDate], (err, forcedLeaveResult) => {
                            if (err) {
                                console.error('Error inserting Forced Leave request:', err);
                                return res.status(500).send(err);
                            }

                            const forcedLeaveId = forcedLeaveResult.insertId;

                            // Insert each unapproved date into leave_request_dates table for the "Forced Leave"
                            const forcedLeaveDatesQueries = unapprovedDates.map(date => {
                                return new Promise((resolve, reject) => {
                                    const insertForcedLeaveDateQuery = `
                                        INSERT INTO leave_request_dates (leave_request_id, leave_date, duration)
                                        VALUES (?, ?, 1)
                                    `;
                                    db.query(insertForcedLeaveDateQuery, [forcedLeaveId, date], (err, result) => {
                                        if (err) reject(err);
                                        else resolve(result);
                                    });
                                });
                            });

                            // Wait for all dates to be inserted
                            Promise.all(forcedLeaveDatesQueries)
                                .then(() => {
                                    // Check if the request was fully or partially approved
                                    if (approvedDays === quantity) {
                                        if(on_behalf){
                                            if(first_approver_email){
                                                const first_approver_rejectionText = `Dear ${first_approver_first_name} ${first_approver_last_name},\n\n${employee_first_name} ${employee_last_name}\'s leave request has been fully approved by HR.\n\nBest Regards`;
                                                const link = 'http://custom-application:3000/login';
                                                sendEmailNotifications(first_approver_email, 'Leave Request Fully Approved For Employee Without Email', first_approver_rejectionText, link);
                                            }
                                            if(manager_email){
                                                const manager_rejectionText = `Dear ${manager_first_name} ${manager_last_name},\n\n${employee_first_name} ${employee_last_name}\'s leave request has been fully approved by HR.\n\nBest Regards`;
                                                const link = 'http://custom-application:3000/login';
                                                sendEmailNotifications(manager_email, 'Leave Request Rejected For Employee Without Email', manager_rejectionText, link);
                                            }
                                        }
                                        else if (!on_behalf){
                                        sendEmailNotifications(employee_email, 'Leave Request Fully Approved', 
                                            `Dear ${employee_first_name} ${employee_last_name},\n\nYour leave request has been fully approved.\n\nBest regards`, link);
                                        }
                                    } else if(unapprovedDates.length > 0){
                                        // Partially approved: send email to the employee with the approved dates
                                        const approvedDatesFormatted = approvedDates.join(', ');

                                        if(on_behalf){
                                            if(first_approver_email){
                                                const first_approver_rejectionText = `Dear ${first_approver_first_name} ${first_approver_last_name},\n\n${employee_first_name} ${employee_last_name}\'s leave request has been partially approved for the following dates: ${approvedDatesFormatted}. Please contact HR for more details.\n\nBest Regards`;
                                                const link = 'http://custom-application:3000/login';
                                                sendEmailNotifications(first_approver_email, 'Leave Request Fully Approved For Employee Without Email', first_approver_rejectionText, link);
                                            }
                                            if(manager_email){
                                                const manager_rejectionText = `Dear ${manager_first_name} ${manager_last_name},\n\n${employee_first_name} ${employee_last_name}\'s leave request has been partially approved for the following dates: ${approvedDatesFormatted}. Please contact HR for more details.\n\nBest Regards`;
                                                const link = 'http://custom-application:3000/login';
                                                sendEmailNotifications(manager_email, 'Leave Request Rejected For Employee Without Email', manager_rejectionText, link);
                                            }
                                        }
                                        else if (!on_behalf){
                                        sendEmailNotifications(employee_email, 'Leave Request Partially Approved', 
                                            `Dear ${employee_first_name} ${employee_last_name},\n\nYour leave request has been partially approved for the following dates: ${approvedDatesFormatted}. Please contact HR for more details.\n\nBest regards`, link);
                                            }
                                        }

                                    res.send({ message: `Leave request approved for ${approvedDays} day(s), email sent to employee` });
                                })
                                .catch(err => {
                                    console.error('Error inserting Forced Leave dates:', err);
                                    return res.status(500).send(err);
                                });
                        });
                    
                });
            } else {

                    // Fully approved branch
                    // Deduct approved days from employee's balance only if leave type is not a sick leave type
                    if (type_of_leave !== "Sick Leave Allowed" && type_of_leave !== "Sick Leave With Medical Report") {
                        const deductApprovedDaysQuery = `
                            UPDATE employee 
                            SET days = days - ? 
                            WHERE id = ?
                        `;
                        db.query(deductApprovedDaysQuery, [approvedDays, employee_id], (err, deductResult) => {
                            if (err) {
                                console.error('Error deducting approved days from employee balance:', err);
                                return res.status(500).send(err);
                            }
                            console.log(`Deducted ${approvedDays} days from employee ${employee_id}`);
                            sendFullyApprovedNotification();
                        });
                    } else {
                        console.log("Skipping balance deduction for Sick Leave Allowed / Sick Leave With Medical Report.");
                        sendFullyApprovedNotification();
                    }
            
                    // Helper function to send notification for fully approved requests
                    function sendFullyApprovedNotification() {
                        if (on_behalf) {
                            if (first_approver_email) {
                                const text = `Dear ${first_approver_first_name} ${first_approver_last_name},\n\n${employee_first_name} ${employee_last_name}'s leave request has been fully approved by HR.\n\nBest Regards`;
                                sendEmailNotifications(first_approver_email, 'Leave Request Fully Approved For Employee Without Email', text, 'http://custom-application:3000/login');
                            }
                            if (manager_email) {
                                const text = `Dear ${manager_first_name} ${manager_last_name},\n\n${employee_first_name} ${employee_last_name}'s leave request has been fully approved by HR.\n\nBest Regards`;
                                sendEmailNotifications(manager_email, 'Leave Request Fully Approved For Employee Without Email', text, 'http://custom-application:3000/login');
                            }
                            res.send({ message: 'Leave request fully approved and email sent' });
                        } else {
                            sendEmailNotifications(employee_email, 'Leave Request Fully Approved', 
                                `Dear ${employee_first_name} ${employee_last_name},\n\nYour leave request has been fully approved.\n\nBest regards`, link);
                            res.send({ message: 'Leave request fully approved and email sent' });
                        }
                    }
            }
        });
    });
});



app.get('/hr-leave-requests', hrAuthenticateToken, (req, res) => {
    const query=`
        SELECT lr.id,
        lr.employee_id AS employeeId,
        CONCAT(e.first_name,' ',e.last_name) AS name,
        lr.type_of_leave AS typeOfLeave,
        lr.request_status AS requestStatus,
        SUM(ld.duration) AS quantity,
        CASE 
            WHEN lr.type_of_leave IN ('Maternity', 'Paternity', 'Marital', 'Compassionate')
            THEN CONCAT(lr.start_date, ' -> ', lr.end_date)
            ELSE GROUP_CONCAT(ld.leave_date)
        END AS dates,
        GROUP_CONCAT(
            CASE 
                WHEN lr.type_of_leave = 'Personal Time Off' THEN CONCAT(DATE_FORMAT(ld.start_time, '%H:%i'), ' -> ', DATE_FORMAT(ld.end_time, '%H:%i'))
                WHEN ld.duration = 0.5 THEN ld.time
                ELSE 'N/A'
            END
        ) AS time, 
        lr.attachment,
        lr.last_modified AS lastModified
        FROM leave_requests lr
        JOIN employee e ON lr.employee_id = e.id
        LEFT JOIN leave_request_dates ld ON lr.id=ld.leave_request_id
        WHERE lr.request_status in ('Pending HR', 'Cancel Requested - Pending HR')
        GROUP BY lr.id
        ORDER BY lr.last_modified DESC
    `;
    db.query(query, (err, result) => {
        // console.log(result);
        if(err) res.status(500).send(err)
        else res.send(result)
    })
})

app.get('/previous-sick-leave-days/:employeeId', authenticateToken, (req, res) => {
    const employeeId = req.params.employeeId;
    const currentYear = new Date().getFullYear();

    const query = `
        SELECT SUM(quantity) as total
        FROM leave_requests
        WHERE employee_id = ? AND YEAR(leave_requests.start_date) = ? AND YEAR(leave_requests.end_date) = ? AND type_of_leave = 'Sick Leave Allowed' AND request_status NOT IN ('Cancelled', 'Rejected')
    `;

    db.query(query, [employeeId, currentYear, currentYear], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send(err);
        }
        const totalDaysWithoutmedicalreport = results[0].total || 0;
        res.send({ total: totalDaysWithoutmedicalreport });
    });
});

app.patch('/leave-requests/:id/reject', authenticateToken, (req, res) => {
    const id = req.params.id;

    const fetchQuery = `
        SELECT lr.employee_id, GROUP_CONCAT(ld.leave_date) AS dates, lr.type_of_leave as typeOfLeave, e.first_name as employee_first_name, e.last_name as employee_last_name, e.email as employee_email
        FROM leave_requests lr
        JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
        JOIN employee e ON lr.employee_id = e.id
        WHERE lr.id = ? AND lr.request_status = 'Pending Manager'
        GROUP BY lr.id
    `;
    db.query(fetchQuery, [id], (err, result) => {
        if (err) {
            console.error('Error fetching leave request:', err);
            res.status(500).send(err);
        } else if (result.length === 0) {
            res.status(404).send({ message: 'Leave request not found or already processed' });
        } else {
            const { employee_id, dates, typeOfLeave, employee_first_name, employee_last_name, employee_email} = result[0];

            const updateRequestQuery = `
                UPDATE leave_requests 
                SET request_status = 'Rejected', last_modified = NOW() 
                WHERE id = ? AND request_status = 'Pending Manager'
            `;
            db.query(updateRequestQuery, [id], (err, updateResult) => {
                if (err) {
                    console.error('Error rejecting leave request:', err);
                    res.status(500).send(err);
                } else {
                    const employeeName = `${employee_first_name} ${employee_last_name}`
                    const subject = 'Leave Request Rejected'
                    const text = `Dear ${employeeName}, \n\nYour leave request has been rejected.\n\nPlease contact your manager for more details.\n\nBest regards`
                    const link = `http://custom-application:3000/leave-requests`;
                    sendEmailNotifications(employee_email,subject, text, link)
                    res.send({ message: 'Leave request rejected' });
                }
            });
        }
    });
});

app.get('/holidays', (req, res) => {
    const query = `
        SELECT *
        FROM holidays
    `;
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching holidays:', err);
            res.status(500).send(err);
        } else {
            res.send(result);
        }
    });
});

app.get('/unavailable-dates/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const query = `
SELECT 
            CASE 
                WHEN main.duration >= 1 THEN 'NONE'
                WHEN main.duration = 0.5 AND main.time = 'AM' THEN 'HD-AM'
                WHEN main.duration = 0.5 AND main.time = 'PM' THEN 'HD-PM'
                WHEN main.start_time IS NOT NULL AND main.end_time IS NOT NULL AND TIMESTAMPDIFF(MINUTE, main.start_time, main.end_time) > 0 THEN 'PTO'
                ELSE 'N/A'
            END AS action,
            main.leave_date as date
        FROM (
            SELECT  
                ld.duration,
                ld.leave_date,
                ld.time,
                ld.start_time,
                ld.end_time
            FROM leave_requests lr
            JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
            WHERE lr.employee_id = ?
              AND (lr.request_status != 'Cancelled' && lr.request_status != 'Rejected')
        ) main
    `;

    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error fetching unavailable dates:', err);
            res.send(err);
        } else {
            res.send(results);
        } 
    });
});

//Leave cancel requests FIRST APPROVER
app.patch('/leave-requests/:id/first-cancel-approve', authenticateToken, (req, res) => {
    const id = req.params.id;

    const fetchQuery = `
    SELECT lr.employee_id, lr.type_of_leave, SUM(ld.duration) as quantity, GROUP_CONCAT(ld.leave_date) AS dates, e.first_name as employee_first_name, e.last_name as employee_last_name, e.email as employee_email, manager_id
    FROM leave_requests lr
    JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
    JOIN employee e ON lr.employee_id = e.id
    WHERE lr.id = ? AND lr.request_status = 'Cancel Requested - Pending First Approval'
    GROUP BY lr.id
    `;
    db.query(fetchQuery, [id], (err, result) => {
        if (err) {
            console.error('Error fetching leave request:', err);
            return res.status(500).send(err);
        } 
        
        if (result.length === 0) {
            console.warn(`No cancel request found for leave request ID: ${id}`);
            return res.status(404).send({ message: 'Cancel request not found or already processed' });
        }
        
        const { employee_id, type_of_leave, quantity, dates, employee_first_name, employee_last_name, employee_email, manager_id} = result[0];

        const updateRequestQuery = `
        UPDATE leave_requests 
        SET request_status = 'Cancel Requested - Pending Manager', last_modified = NOW() 
        WHERE id = ? AND request_status = 'Cancel Requested - Pending First Approval'
        `;

        db.query(updateRequestQuery, [id], (err, updateResult) => {
            if (err) {
                console.error('Error approving cancel request:', err);
                return res.status(500).send(err);
            }
            
            const getManagerInfo = `SELECT first_name, email FROM employee WHERE id = ?`;
            db.query(getManagerInfo, [manager_id], (MAerror, MAresults) =>{
                if(MAerror){
                    console.error('Error fetching manager info: ', err);
                    return res.status(500).send(err);
                }

                const managerName = MAresults[0].first_name;
                const managerEmail = MAresults[0].email;
                const employeeName=`${employee_first_name} ${employee_last_name}`
                const subject = 'New Leave Cancellation Request'
                const text = `Dear ${managerName},\n\nA new leave cancel request for ${employeeName} is pending your approval.\n\nBest regards.`;
                const link = `http://custom-application:3000/manager-leave-requests`;
                sendEmailNotifications(managerEmail,subject, text, link)
    
    
                res.send({ message: 'Cancel request approved and days updated' });
            });

        });

    });
});
app.patch('/leave-requests/:id/first-cancel-reject', authenticateToken, (req, res) => {
    const id = req.params.id;

    const fetchQuery = `
        SELECT lr.employee_id, lr.type_of_leave, SUM(ld.duration) as quantity, GROUP_CONCAT(ld.leave_date) AS dates, e.first_name as employee_first_name, e.last_name as employee_last_name, e.email as employee_email
        FROM leave_requests lr
        JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
        JOIN employee e ON lr.employee_id = e.id
        WHERE lr.id = ? AND lr.request_status = 'Cancel Requested - Pending First Approval'
        GROUP BY lr.id
    `;

    db.query(fetchQuery, [id], (err, result) => {
        if (err) {
            console.error('Error fetching leave request:', err);
            return res.status(500).send(err);
        } 
        
        if (result.length === 0) {
            console.warn(`No cancel request found for leave request ID: ${id}`);
            return res.status(404).send({ message: 'Cancel request not found or already processed' });
        }
        
        const {employee_first_name, employee_last_name, employee_email } = result[0];
        
        const updateRequestQuery = `
            UPDATE leave_requests 
            SET request_status = 'Approved', last_modified = NOW() 
            WHERE id = ? AND request_status = 'Cancel Requested - Pending First Approval'
        `;
        db.query(updateRequestQuery, [id], (err, updateResult) => {
            if (err) {
                console.error('Error rejecting cancel request:', err);
                return res.status(500).send(err);
            }else{
                const subject ='Leave Cancellation Request Rejected'
                const employeeName = `${employee_first_name} ${employee_last_name}`
                const text = `Dear ${employeeName}, \n\nYour cancel leave request has been rejected. The status of your leave request has been reverted to "Approved".\n\nPlease contact your first approver for more details.\n\nBest regards`
                const link = `http://custom-application:3000/leave-requests`
                sendEmailNotifications(employee_email,subject, text, link)
                res.send({ message: 'Cancel request rejected and status reverted to approved' })
            }

        })
    
    });
});

//Leave cancel requests MANAGER
app.patch('/leave-requests/:id/cancel-approve', authenticateToken, (req, res) => {
    const id = req.params.id;

    const fetchQuery = `
        SELECT lr.employee_id, lr.type_of_leave, SUM(ld.duration) as quantity, GROUP_CONCAT(ld.leave_date) AS dates, e.first_name as employee_first_name, e.last_name as employee_last_name, e.email as employee_email
        FROM leave_requests lr
        JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
        JOIN employee e ON lr.employee_id = e.id
        WHERE lr.id = ? AND lr.request_status = 'Cancel Requested - Pending Manager'
        GROUP BY lr.id
    `;

    db.query(fetchQuery, [id], (err, result) => {
        if (err) {
            console.error('Error fetching leave request:', err);
            return res.status(500).send(err);
        } 
        
        if (result.length === 0) {
            console.warn(`No cancel request found for leave request ID: ${id}`);
            return res.status(404).send({ message: 'Cancel request not found or already processed' });
        }
        
        const { employee_id, type_of_leave, quantity, dates, employee_first_name, employee_last_name, employee_email } = result[0];

        const updateRequestQuery = `
        UPDATE leave_requests 
        SET request_status = 'Cancel Requested - Pending HR', last_modified = NOW() 
        WHERE id = ? AND request_status = 'Cancel Requested - Pending Manager'
    `;
    db.query(updateRequestQuery, [id], (err, updateResult) => {
            if (err) {
                console.error('Error approving cancel request:', err);
                return res.status(500).send(err);
            } 

            const employeeName=`${employee_first_name} ${employee_last_name}`
            const hrEmail = 'leaverequest@gmail.com'
            const subject = 'Leave Cancellation Request Pending'
            const hrText=`Dear HR, \n\nA new cancel leave request for ${employeeName} for dates ${dates} is waiting for your approval.\n\nBest regards`
            const hr_link = `http://custom-application:3000/hr-leave-requests`;
            sendEmailNotifications(hrEmail,subject, hrText, hr_link)


            res.send({ message: 'Cancel request approved and days updated' });

        });

    });

});
app.patch('/leave-requests/:id/cancel-reject', authenticateToken, (req, res) => {
    const id = req.params.id;

    const fetchQuery = `
        SELECT lr.employee_id, lr.type_of_leave, SUM(ld.duration) as quantity, GROUP_CONCAT(ld.leave_date) AS dates, e.first_name as employee_first_name, e.last_name as employee_last_name, e.email as employee_email
        FROM leave_requests lr
        JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
        JOIN employee e ON lr.employee_id = e.id
        WHERE lr.id = ? AND lr.request_status = 'Cancel Requested - Pending Manager'
        GROUP BY lr.id
    `;
    db.query(fetchQuery, [id], (err, result) => {
        if (err) {
            console.error('Error fetching leave request:', err);
            return res.status(500).send(err);
        } 
        
        if (result.length === 0) {
            console.warn(`No cancel request found for leave request ID: ${id}`);
            return res.status(404).send({ message: 'Cancel request not found or already processed' });
        }
        
        const {employee_first_name, employee_last_name, employee_email } = result[0];

        const updateRequestQuery = `
            UPDATE leave_requests 
            SET request_status = 'Approved', last_modified = NOW() 
            WHERE id = ? AND request_status = 'Cancel Requested - Pending Manager'
        `;
        db.query(updateRequestQuery, [id], (err, updateResult) => {
            if (err) {
                console.error('Error rejecting cancel request:', err);
                return res.status(500).send(err);
            }else{
                const subject ='Leave Cancellation Request Rejected'
                const employeeName = `${employee_first_name} ${employee_last_name}`
                const text = `Dear ${employeeName}, \n\nYour cancel leave request has been rejected. The status of your leave request has been reverted to "Approved".\n\nPlease contact your manager for more details.\n\nBest regards`
                const link = `http://custom-application:3000/leave-requests`
                sendEmailNotifications(employee_email,subject, text, link)
                res.send({ message: 'Cancel request rejected and status reverted to approved' })
            }

        });
    });
});

//Leave cancel requests HR
app.patch('/leave-requests/:id/hr-cancel-approve', authenticateToken, (req, res) => {
    const id = req.params.id;

        const fetchQuery = `
            SELECT lr.employee_id, lr.type_of_leave, SUM(ld.duration) as quantity, GROUP_CONCAT(ld.leave_date) AS dates, e.first_name as employee_first_name, e.last_name as employee_last_name, e.email as employee_email
            FROM leave_requests lr
            JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
            JOIN employee e ON lr.employee_id = e.id
            WHERE lr.id = ? AND lr.request_status = 'Cancel Requested - Pending HR'
            GROUP BY lr.id
        `;

        db.query(fetchQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error fetching leave request:', err);
                        return res.status(500).send(err);
                    } 
                    
                    if (result.length === 0) {
                        console.warn(`No cancel request found for leave request ID: ${id}`);
                        return res.status(404).send({ message: 'Cancel request not found or already processed' });
                    }
                    
                    const { employee_id, type_of_leave, quantity, dates, employee_first_name, employee_last_name, employee_email } = result[0];

                    const updateRequestQuery = `
                                UPDATE leave_requests 
                                SET request_status = 'Cancelled', last_modified = NOW() 
                                WHERE id = ? AND request_status = 'Cancel Requested - Pending HR'
                            `;
                            db.query(updateRequestQuery, [id], (err, updateResult) => {
                                if (err) {
                                    console.error('Error approving cancel request:', err);
                                    return res.status(500).send(err);
                                } 

                                const employeeName=`${employee_first_name} ${employee_last_name}`
                                const employeeEmail = `${employee_email}`
                                const hrEmail = 'leaverequest@gmail.com'
                                const subject = 'Leave Cancellation Request Approved'
                                const employeeText = `Dear ${employeeName}, \n\nYour cancel leave request has been approved. Leave request successfully cancelled.\n\nBest regards`
                                const hrText=`Dear HR, \n\nThe cancel leave request of ${employeeName} for dates ${dates} has been approved. Leave request successfully cancelled.\n\nBest regards`
                                const employee_link = `http://custom-application:3000/leave-requests`;
                                const hr_link = `http://custom-application:3000/hr-leave-requests`;
                                sendEmailNotifications(employeeEmail,subject, employeeText, employee_link)
                                sendEmailNotifications(hrEmail,subject, hrText, hr_link)

                                if (type_of_leave === 'Annual Paid Leave') {
                                    const updateDaysQuery = `
                                        UPDATE employee 
                                        SET days = days + ? 
                                        WHERE id = ?
                                    `;
                                    db.query(updateDaysQuery, [quantity, employee_id], (err, updateDaysResult) => {
                                        if (err) {
                                            console.error('Error updating employee days:', err);
                                            return res.status(500).send(err);
                                        } 
                                    
                                        res.send({ message: 'Cancel request approved and days updated' });
                                    });
                                } else {
                                    res.send({ message: 'Cancel request approved without updating days for sick leave' });
                                }
                            });
                });

});
app.patch('/leave-requests/:id/hr-cancel-reject', authenticateToken, (req, res) => {
    const id = req.params.id;

    const fetchQuery = `
        SELECT lr.employee_id, lr.type_of_leave, SUM(ld.duration) as quantity, GROUP_CONCAT(ld.leave_date) AS dates, e.first_name as employee_first_name, e.last_name as employee_last_name, e.email as employee_email
        FROM leave_requests lr
        JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
        JOIN employee e ON lr.employee_id = e.id
        WHERE lr.id = ? AND lr.request_status = 'Cancel Requested - Pending HR'
        GROUP BY lr.id
    `;
    db.query(fetchQuery, [id], (err, result) => {
        if (err) {
            console.error('Error fetching leave request:', err);
            return res.status(500).send(err);
        } 
        
        if (result.length === 0) {
            console.warn(`No cancel request found for leave request ID: ${id}`);
            return res.status(404).send({ message: 'Cancel request not found or already processed' });
        }
        
        const {employee_first_name, employee_last_name, employee_email } = result[0];

        const updateRequestQuery = `
            UPDATE leave_requests 
            SET request_status = 'Approved', last_modified = NOW() 
            WHERE id = ? AND request_status = 'Cancel Requested - Pending HR'
        `;
        db.query(updateRequestQuery, [id], (err, updateResult) => {
            if (err) {
                console.error('Error rejecting cancel request:', err);
                return res.status(500).send(err);
            }else{
                const subject ='Leave Cancellation Request Rejected'
                const employeeName = `${employee_first_name} ${employee_last_name}`
                const text = `Dear ${employeeName}, \n\nYour cancel leave request has been rejected. The status of your leave request has been reverted to "Approved".\n\nPlease contact HR for more details.\n\nBest regards`
                const link = `http://custom-application:3000/leave-requests`
                sendEmailNotifications(employee_email,subject, text, link)

                res.send({ message: 'Cancel request rejected and status reverted to approved' })
            }

        });
    });
})


app.get('/department-leaves', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
SELECT 
    e.id AS employee_id,
    CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
    lr.type_of_leave,
    lr.request_status,
    ld.leave_date,
    ld.duration,
    ld.time
FROM leave_requests lr
JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
JOIN employee e ON lr.employee_id = e.id
WHERE e.manager_id = ? 
AND lr.request_status IN ('Approved')
    `;
    db.query(query, [userId], (err, result) => {
        if (err) res.status(500).send(err);
        else res.send(result);
    });
});
app.post('/holiday', hrAuthenticateToken, async (req, res) => {
    const { startDate, endDate, description } = req.body;
    const hrUserId = getIdFromToken(req); // Get HR user ID from token
    const formattedStartDate = moment(startDate).format('YYYY-MM-DD');
    const formattedEndDate = moment(endDate).format('YYYY-MM-DD');

    const holidayQuery = `
        INSERT INTO holidays (start_date, end_date, description) VALUES (?, ?, ?)
    `;
    
    db.query(holidayQuery, [formattedStartDate, formattedEndDate, description], (err, result) => {
        if (err) {
            console.error('Error inserting holiday:', err);
            return res.status(500).send(err);
        }
        
        addLog(hrUserId, 'Add Holiday', `Added holiday from ${formattedStartDate} to ${formattedEndDate} with description: ${description}`);

        const findLeaveRequestsQuery = `
            SELECT lr.id, lr.employee_id, lr.type_of_leave, lr.quantity, lrd.duration, lrd.leave_date, lr.request_status
            FROM leave_requests lr
            JOIN leave_request_dates lrd ON lr.id = lrd.leave_request_id
            WHERE lrd.leave_date BETWEEN ? AND ?
            AND lr.request_status IN ('Approved', 'Pending Manager', 'Pending First Approval', 'Cancel Requested')
        `;

        db.query(findLeaveRequestsQuery, [formattedStartDate, formattedEndDate], (err, leaveRequests) => {
            if (err) {
                console.error('Error finding leave requests:', err);
                return res.status(500).send(err);
            }

            const updateRequests = leaveRequests.map(request => {
                return new Promise((resolve, reject) => {
                    db.query(`UPDATE leave_requests SET request_status = 'Cancelled' WHERE id = ?`, [request.id], (err, result) => {
                        if (err) {
                            console.error('Error updating leave request status:', err);
                            return reject(err);
                        }

                        if ((request.type_of_leave === 'Annual Paid Leave' || request.type_of_leave === 'Unpaid Leave') && request.request_status === 'Approved') {
                            db.query(`
                                UPDATE employee
                                SET days = days + ?
                                WHERE id = ?
                            `, [request.duration, request.employee_id], (err, result) => {
                                if (err) {
                                    console.error('Error updating employee days:', err);
                                    return reject(err);
                                }
                                resolve();
                            });
                        } else {
                            resolve();
                        }
                    });
                });
            });

            Promise.all(updateRequests)
                .then(() => res.send({ message: 'Holiday added and leave requests updated successfully' }))
                .catch(err => {
                    console.error('Error updating leave requests:', err);
                    res.status(500).send(err);
                });
        });
    });
});
app.get('/all-department-leaves', hrAuthenticateToken, (req, res) => {
    const query = `
        SELECT 
            e.id AS employee_id,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            lr.type_of_leave,
            lr.request_status,
            ld.leave_date,
            ld.start_time,
            ld.end_time,
            ld.duration,
            ld.time
        FROM leave_requests lr
        JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
        JOIN employee e ON lr.employee_id = e.id
        WHERE lr.request_status IN ('Approved') 
    `;
    db.query(query, (err, result) => {
        if (err) res.status(500).send(err);
        else res.send(result);
    });
});
app.get('/department-leaves/:departmentId', hrAuthenticateToken, (req, res) => {
    const departmentId = req.params.departmentId;
    const query = `
        SELECT 
            e.id AS employee_id,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            lr.type_of_leave,
            lr.request_status,
            ld.leave_date,
            ld.start_time,
            ld.end_time,
            ld.duration,
            ld.time
        FROM leave_requests lr
        JOIN leave_request_dates ld ON lr.id = ld.leave_request_id
        JOIN employee e ON lr.employee_id = e.id
        WHERE e.department_id = ? AND lr.request_status ='Approved' 
    `;
    db.query(query, [departmentId], (err, result) => {
        if (err) res.status(500).send(err);
        else res.send(result);
    });
});

app.get('/remaining-timeoff/:employeeId', authenticateToken, (req, res) => {
    const employeeId = req.params.employeeId;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // console.log(`Fetching remaining time off for employeeId: ${employeeId}, Month: ${currentMonth}, Year: ${currentYear}`);

    const checkPTOQuery = `
        SELECT SUM(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as totalMinutes
        FROM leave_request_dates
        JOIN leave_requests ON leave_request_dates.leave_request_id = leave_requests.id
        WHERE leave_requests.employee_id = ? 
        AND leave_requests.type_of_leave = 'Personal Time Off'
        AND MONTH(leave_request_dates.leave_date) = ? 
        AND YEAR(leave_request_dates.leave_date) = ?
        AND leave_requests.request_status NOT IN ('Cancelled', 'Rejected')
    `;

    db.query(checkPTOQuery, [employeeId, currentMonth, currentYear], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send(err);
        }

        // console.log('Query results:', results);

        const totalMinutesTaken = parseFloat(results[0].totalMinutes) || 0;
        // console.log(`Total minutes taken: ${totalMinutesTaken}`);

        const remainingMinutes = Math.max(0, 120 - totalMinutesTaken);
        // console.log(`Remaining minutes: ${remainingMinutes}`);

        res.send({ remainingMinutes });
    });
});

app.get('/location', hrAuthenticateToken, (req, res) => {
    const dbQuery = `
        SELECT id, location_name FROM location;
    `;

    db.query(dbQuery, (err, results) => {
        if (err) return res.status(500).send(err);
        else res.send(results);
    });
});

app.get('/bank_location', (req, res) => {
    const dbQuery = `
        SELECT id, location FROM bank_location;
    `;

    db.query(dbQuery, (err, results) => {
        if (err) return res.status(500).send(err);
        else res.send(results);
    });
});


app.get('/bank-relations', (req, res) => {
    const dbQuery = `
        SELECT id, relation FROM bank_relation;
    `;

    db.query(dbQuery, (err, results) => {
        if (err) return res.status(500).send(err);
        else res.send(results);
    });
});

app.post('/location', hrAuthenticateToken, (req, res) => {
    const { location_name} = req.body;
    const hrUserId = getIdFromToken(req); 
    const dbQuery = `
        INSERT INTO location
        (location_name) VALUES (?);
    `;

    db.query(dbQuery, [location_name], (err, result) => {
        if (err) return res.status(500).send(err);
        else{
            const newLocationId = result.insertId;
            db.query(`SELECT * FROM location WHERE id = ?`, [newLocationId], (err, newLocResult) => {
                if (err) {
                    res.send(err);
                } else {
                    addLog(hrUserId, 'Add Location', `Added location: ${location_name}`);
                    res.send(newLocResult[0]);
                }
            });
        }
    });
});
app.patch('/locations/:id', hrAuthenticateToken, (req, res) => {
    const locationId = req.params.id;
    const { location_name} = req.body;

    const updateQuery = `
        UPDATE location 
        SET location_name = ?
        WHERE id = ?;
    `;

    db.query(updateQuery, [location_name, locationId], (err, result) => {
        if (err) {
            console.error('Database update error:', err);
            return res.status(500).send('An error occurred while updating the location.');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Location not found.');
        }

        res.send({ 
            id: locationId, 
            location_name
        });
    });
});

cron.schedule('0 0 30 6 *', () => {
    console.log('Running June 30th leave deduction check...');

    // Fetch all employees
    const getEmployeesQuery = `
        SELECT id, start_date, days
        FROM employee
    `;

    db.query(getEmployeesQuery, (err, employees) => {
        if (err) {
            console.error('Error fetching employees:', err);
            return;
        }

        employees.forEach(employee => {
            const { id, start_date, days } = employee;
            const startMoment = moment(start_date);
            const currentMoment = moment();
            const yearsOfService = currentMoment.diff(startMoment, 'years');

            // Calculate leave days per year based on service years and manager status
            let leaveDaysPerYear = 15;
            isManager(id).then(isManagerStatus => {
                if (isManagerStatus) {
                    leaveDaysPerYear = 21;
                } else if (yearsOfService >= 15) {
                    leaveDaysPerYear = 21;
                } else if (yearsOfService >= 5) {
                    leaveDaysPerYear = 18;
                }

                const daysToBeConsumed = days - (leaveDaysPerYear * 2);
                if (daysToBeConsumed > 0) {
                    const updatedDays = days - daysToBeConsumed;

                    // Update the employee's days
                    const updateDaysQuery = `UPDATE employee SET days = ? WHERE id = ?`;
                    db.query(updateDaysQuery, [updatedDays, id], (updateErr) => {
                        if (updateErr) {
                            console.error(`Error updating days for employee ID ${id}:`, updateErr);
                        } else {
                            // console.log(`Updated days for employee ID ${id}: ${updatedDays}`);
                        }
                    });
                }
            }).catch(err => {
                console.error('Error checking if employee is a manager:', err);
            });
        });
    });
});


// Deduct and refresh leave days for all employees
app.post('/deduct-leave', (req, res) => {
    console.log('Manually triggered leave deduction...')
        // Fetch all employees
        const getEmployeesQuery = `
        SELECT id, start_date, days
        FROM employee
    `;

    db.query(getEmployeesQuery, (err, employees) => {
        if (err) {
            console.error('Error fetching employees:', err);
            return res.status(500).json({message:`Error fetching employees`});
        }

        const promises = employees.map(employee => {
            const { id, start_date, days:currentDays } = employee;
            const startMoment = moment(start_date);
            const currentMoment = moment();
            const yearsOfService = currentMoment.diff(startMoment, 'years');

            // Calculate leave days per year based on service years and manager status
            let leaveDaysPerYear = 15;
            isManager(id).then(isManagerStatus => {
                if (isManagerStatus) {
                    leaveDaysPerYear = 21;
                } else if (yearsOfService >= 15) {
                    leaveDaysPerYear = 21;
                } else if (yearsOfService >= 5) {
                    leaveDaysPerYear = 18;
                }

                const daysToBeConsumed = currentDays - (leaveDaysPerYear * 2);
                if (daysToBeConsumed > 0) {
                    const updatedDays = currentDays - daysToBeConsumed;

                    const logBalanceQuery = `
                        INSERT INTO leave_balance_log (employee_id, balance_before, balance_after, log_date) VALUES (?, ?, ?, NOW())
                    `
                    return new Promise((resolve, reject) => {
                        db.query(logBalanceQuery, [id, currentDays, updatedDays], (logErr) => {
                            if(logErr){
                                console.error(`Error logging balance for employee with ID ${id}`, logErr)
                                return reject(logErr)
                            }
                             
                            const updateDaysQuery = `UPDATE employee SET days = ? WHERE id = ?`;
                            db.query(updateDaysQuery, [updatedDays, id], (updateErr) => {
                                if (updateErr) {
                                    console.error(`Error updating days for employee ID ${id}:`, updateErr);
                                    return reject(updateErr)
                                } else {
                                    console.log(`Updated days for employee ID ${id}: ${updatedDays}`);
                                    resolve()
                                }
                            });
                        })
                    })
                }else{
                    return Promise.resolve()
                }
            }).catch(err => {
                console.error('Error checking if employee is a manager:', err);
                return Promise.reject(err)
            });
        });
        Promise.all(promises)
            .then(()=>{
                res.status(200).json({message:'Leave deduction process completed successfully.'})
            })
            .catch(err=>{
                console.error("Error during leave deduction:",err)
                res.status(500).json({message:'Error duing leave deduction process.'})
            })
    });
});

app.get('/leave-balance-logs', async (req, res)=>{
    try{
        const query=`
            SELECT 
                leave_balance_log.id,
                leave_balance_log.employee_id,
                leave_balance_log.balance_before,
                leave_balance_log.balance_after,
                leave_balance_log.log_date,
                employee.first_name,
                employee.last_name
            FROM leave_balance_log
            JOIN employee ON leave_balance_log.employee_id = employee.id
            ORDER BY leave_balance_log.log_date DESC
        `;
        db.query(query, (err, results)=>{
            if(err){
                console.error('Error fetching leave balance logs:',err);
                return res.status(500).json({message:'Error fetching leave balance logs'})
            }
            res.status(200).json(results)
        })
    }catch(error){
        console.error('Service error:',error);
        res.status(500).json({message:'Service error'})
    }

})