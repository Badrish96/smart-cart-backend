const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const PROFILE_FIELDS = 'name email phone profilePicture dateOfBirth gender addresses role createdAt';

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(PROFILE_FIELDS);
    return successResponse(res, 200, 'Profile fetched successfully', { user });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, dateOfBirth, gender } = req.body;
    const user = await User.findById(req.user._id);

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (gender !== undefined) user.gender = gender;

    const file = req.files?.[0];
    if (file) {
      if (user.profilePicture?.publicId) {
        await deleteFromCloudinary(user.profilePicture.publicId);
      }
      user.profilePicture = await uploadToCloudinary(file.buffer, 'smart-cart/profiles');
    }

    await user.save({ validateBeforeSave: false });

    const updated = await User.findById(user._id).select(PROFILE_FIELDS);
    return successResponse(res, 200, 'Profile updated successfully', { user: updated });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const addAddress = async (req, res) => {
  try {
    const { label, fullName, phone, street, city, state, zipCode, country, isDefault } = req.body;
    const user = await User.findById(req.user._id);

    if (isDefault) {
      user.addresses.forEach((addr) => { addr.isDefault = false; });
    }

    user.addresses.push({ label, fullName, phone, street, city, state, zipCode, country, isDefault: !!isDefault });
    await user.save({ validateBeforeSave: false });

    return successResponse(res, 201, 'Address added successfully', { addresses: user.addresses });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, fullName, phone, street, city, state, zipCode, country, isDefault } = req.body;

    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);
    if (!address) return errorResponse(res, 404, 'Address not found');

    if (isDefault) {
      user.addresses.forEach((addr) => { addr.isDefault = false; });
    }

    if (label !== undefined) address.label = label;
    if (fullName !== undefined) address.fullName = fullName;
    if (phone !== undefined) address.phone = phone;
    if (street !== undefined) address.street = street;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (zipCode !== undefined) address.zipCode = zipCode;
    if (country !== undefined) address.country = country;
    if (isDefault !== undefined) address.isDefault = !!isDefault;

    await user.save({ validateBeforeSave: false });

    return successResponse(res, 200, 'Address updated successfully', { addresses: user.addresses });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);
    if (!address) return errorResponse(res, 404, 'Address not found');

    address.deleteOne();
    await user.save({ validateBeforeSave: false });

    return successResponse(res, 200, 'Address deleted successfully', { addresses: user.addresses });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

module.exports = { getProfile, updateProfile, addAddress, updateAddress, deleteAddress };
