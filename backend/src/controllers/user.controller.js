import httpStatus from 'http-status';
import {User} from '../models/user.model.js';
import {Meeting} from '../models/meeting.model.js';
import bcrypt, {hash} from 'bcrypt'; 
import crypto from 'crypto';

const register = async(req, res)=> {
    const {name, username, password }= req.body;

    try{
        const existingUser =await User.findOne({username});
        if(existingUser){
            return res.status(httpStatus.FOUND).json({message: 'User already exists with this username'});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser =  new User({
            name: name,
            username: username,
            password: hashedPassword
        });
        await newUser.save();
        console.log('New user registered:', newUser);
        res.status(httpStatus.CREATED).json({ message: 'User registered successfully',
            user: {
                id: newUser._id,
                name: newUser.name,
                username: newUser.username
            }
        });

    }catch(err){
        console.error('Error during registration:', err);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: 'Internal server error'});
    }
}

const login = async (req, res) => {
    const { username, password } = req.body;
    
    // Input validation
    if (!username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Username and password are required'
        });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: 'Invalid credentials'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Password comparison result:', isPasswordValid);
        if (!isPasswordValid) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: 'Invalid credentials'
            });
        }

        // Generate a more secure token
        const token = crypto.randomBytes(10).toString('hex');
        user.token = token;
        await user.save();

        return res.status(httpStatus.OK).json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                token: user.token
            }
        });

    } catch (err) {
        console.error('Error during login:', err);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Internal server error'
        });
    }
};

const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ token: token });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const meetings = await Meeting.find({ user_id: user.username })
        res.json(meetings)
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    try {
        const user = await User.findOne({ token: token });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        })

        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ message: "Added code to history" })
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export { login, register, getUserHistory, addToHistory }