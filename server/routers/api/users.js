import { Router } from 'express';
import User from '/server/models/user';
import Helper from '/server/middleware/data-validation';
import validate from '/shared/validation/userValidation';
import { isAuthenticated, checkAccessForUserIds } from '/server/middleware/authentication';
import { setIds, assignSingleDocument, renderResult } from '/server/middleware';

const router = Router();

// all routes have the base url /api/users

router.route('/')
	.post(
		// first, make sure data is valid (not checking for conflicts)
		(req, res, next) => {
			const { errors, isValid } = validate(req.body);
			if (isValid) {
				next();
			} else {
				next({ status: 400, message: 'Invalid user data', errors });
			}
		},
		(req, res, next) => {
			new User(req.body).save((err, user) => {
				if (!err) {
					res.status(201).json({ id: user._id });
				} else {
					if (err.name === 'ValidationError') {
						const errors = {};
						for (let field in err.errors) {
							errors[field] = 'This ' + field + ' is taken';
						}
						next({ status: 409, errors }); //ooh baby that object spread
					} else {
						next({ status: 400, message: err.message });
					}
				}
			});
		}
	);

router.route('/id/:userId')
	.get(
		setIds(req => [req.params.userId]),
		Helper.idValidator,
		Helper.fetchUsers,
		assignSingleDocument('user', 'users'),
		renderResult('user')
	);

router.route('/id/:userId/locations')
	.get(
		isAuthenticated('Authentication required to view locations'),
		setIds(req => [req.params.userId]),
		Helper.idValidator,
		Helper.checkUsers,
		checkAccessForUserIds("You may not view another user's locations"),
		(req, res, next) => {
			const [id] = req.ids;
			User.findById(id).populate('locations').exec((err, match) => {
				res.json(match.locations);
			});
		}
	);

export default router;
