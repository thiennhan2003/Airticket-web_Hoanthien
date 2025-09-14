import createError from 'http-errors';
import User from '../models/users.model';
import bcrypt from 'bcryptjs';
/**
 * Service :
 * - Nhận đầu vào từ controller
 * - Xử lý logic
 * - Lấy dữ liệu về cho Controller
 */

const getAll = async(query: any) => {
    const { page = 1, limit = 10} = query;
    let sortObject = {};
    const sortType = query.sort_type || 'desc';
    const sortBy = query.sort_by || 'createdAt';
    sortObject = {...sortObject, [sortBy]: sortType === 'desc' ? -1 : 1};

    console.log('sortObject : ', sortObject);
    console.log(query);

    //Tìm kiếm theo điều kiện
    let where = {};
    // nếu có tìm kiếm theo tên nhân viên
    if (query.fullName && query.fullName.length > 0) {
        where = { ...where, fullName: { $regex: query.fullName, $options: 'i'}};
    }
    const users = await User
    .find(where)
    .skip((page-1)*limit)
    .limit(limit)
    .sort({...sortObject});

    //Đếm tổng số record hiện có của collection user
    const count = await User.countDocuments(where);
    console.log('user: ', users);

    return {
        users,
        pagination: {
            totalRecord: count,
            limit,
            page
        }
    };
}

const getById = async(id: string) => {
    const user = await User.findById(id).select('-password');
        if (!user) {
            //throw new Error("user not found");
            throw createError(404, "user not found");
        }
        return user;
}

const create = async (payload: any) => {
    //kiểm tra xem email có tồn tại không
    const emailExist = await User.findOne({email: payload.email});
    if(emailExist) {
        throw createError(400, 'Email already exists');
    }
    const user = new User({
        fullName: payload.fullName,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        password: payload.password,
        role: payload.role,
        isActive: payload.isActive
       
    });
    // lưu vào database
    await user.save();
    // trả về item được tạo ra
    return user;
}

const updateById = async(id: string, payload: any) => {
    //kiểm tra xem id có tồn tại không
    const user = await getById(id);

    //kiểm tra xem email có tồn tại không
    const emailExist = await User.findOne({
        email: payload.email,
        _id: { $ne: id }
    });
    if(emailExist) {
        throw createError(400, 'Email already exists');
    }
    
    const cleanUpdates = Object.fromEntries(
    Object.entries(payload).filter(
      ([value]) => value !== "" && value !== null && value !== undefined
    )
  );

    // Kiểm tra nếu có thay đổi mật khẩu
    if (payload.password) {
        // Mã hóa lại mật khẩu mới
        const hashedPassword = await bcrypt.hash(payload.password, 10);
        cleanUpdates.password = hashedPassword; // Cập nhật mật khẩu đã mã hóa
    }

    //cập nhật nhân viên
    Object.assign(user, cleanUpdates); // trộn dữ liệu mới và cũ
    await user.save();
    return user;
}

const deleteById = async(id: string) => {
    // kiểm tra xem id có tồn tại không
    const user = await getById(id);
    // thực hiện lệnh delete
    await user.deleteOne({_id: user.id});
    return user;
}

export default {
    getAll,
    getById,
    create,
    updateById,
    deleteById
}