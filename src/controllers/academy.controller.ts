import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

// Get all academies
export const getAcademies = async (req: AuthRequest, res: Response) => {
  const {
    type,
    location,
    search,
    page = 1,
    limit = 10,
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('Academy')
    .select('*', { count: 'exact' });

  if (type) {
    query = query.eq('type', type);
  }

  if (location) {
    query = query.ilike('location', `%${location}%`);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  query = query.order('name', { ascending: true });
  query = query.range(offset, offset + Number(limit) - 1);

  const { data: academies, error, count } = await query;

  if (error) {
    throw createError('Failed to fetch academies', 500);
  }

  res.json({
    success: true,
    data: academies,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count || 0,
      totalPages: Math.ceil((count || 0) / Number(limit)),
    },
  });
};

// Get academy by ID
export const getAcademyById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const { data: academy, error } = await supabase
    .from('Academy')
    .select(`
      *,
      courses:Course(*)
    `)
    .eq('id', id)
    .single();

  if (error || !academy) {
    throw createError('Academy not found', 404);
  }

  res.json({
    success: true,
    data: academy,
  });
};

// Create academy
export const createAcademy = async (req: AuthRequest, res: Response) => {
  const {
    name,
    type,
    location,
    description,
    imageUrl,
    phone,
    email,
    website,
  } = req.body;

  const { data: academy, error } = await supabase
    .from('Academy')
    .insert({
      name,
      type,
      location,
      description: description || null,
      imageUrl: imageUrl || null,
      phone: phone || null,
      email: email || null,
      website: website || null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Create academy error:', error);
    throw createError('Failed to create academy', 500);
  }

  res.status(201).json({
    success: true,
    message: 'Academy created successfully',
    data: academy,
  });
};

// Update academy
export const updateAcademy = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  const allowedFields = [
    'name', 'type', 'location', 'description', 'imageUrl',
    'phone', 'email', 'website'
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const { data: academy, error } = await supabase
    .from('Academy')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw createError('Failed to update academy', 500);
  }

  res.json({
    success: true,
    message: 'Academy updated successfully',
    data: academy,
  });
};

// Delete academy
export const deleteAcademy = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Delete related records
  await supabase.from('Course').delete().eq('academyId', id);
  await supabase.from('Enquiry').delete().eq('academyId', id);

  const { error } = await supabase.from('Academy').delete().eq('id', id);

  if (error) {
    throw createError('Failed to delete academy', 500);
  }

  res.json({
    success: true,
    message: 'Academy deleted successfully',
  });
};

// Get academy courses
export const getAcademyCourses = async (req: AuthRequest, res: Response) => {
  const { id: academyId } = req.params;

  const { data: courses, error } = await supabase
    .from('Course')
    .select('*')
    .eq('academyId', academyId)
    .order('name', { ascending: true });

  if (error) {
    throw createError('Failed to fetch courses', 500);
  }

  res.json({
    success: true,
    data: courses,
  });
};

// Add course to academy
export const addCourse = async (req: AuthRequest, res: Response) => {
  const { id: academyId } = req.params;
  const { name, description, duration, fee } = req.body;

  // Check if academy exists
  const { data: academy } = await supabase
    .from('Academy')
    .select('id')
    .eq('id', academyId)
    .single();

  if (!academy) {
    throw createError('Academy not found', 404);
  }

  const { data: course, error } = await supabase
    .from('Course')
    .insert({
      name,
      description: description || null,
      duration: duration || null,
      fee: fee || null,
      academyId,
    })
    .select('*')
    .single();

  if (error) {
    throw createError('Failed to add course', 500);
  }

  res.status(201).json({
    success: true,
    message: 'Course added successfully',
    data: course,
  });
};

// Update course
export const updateCourse = async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;

  const updateData: Record<string, any> = {};

  const allowedFields = ['name', 'description', 'duration', 'fee'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const { data: course, error } = await supabase
    .from('Course')
    .update(updateData)
    .eq('id', courseId)
    .select('*')
    .single();

  if (error) {
    throw createError('Failed to update course', 500);
  }

  res.json({
    success: true,
    message: 'Course updated successfully',
    data: course,
  });
};

// Delete course
export const deleteCourse = async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;

  const { error } = await supabase.from('Course').delete().eq('id', courseId);

  if (error) {
    throw createError('Failed to delete course', 500);
  }

  res.json({
    success: true,
    message: 'Course deleted successfully',
  });
};

// Send enquiry
export const sendEnquiry = async (req: AuthRequest, res: Response) => {
  const { id: academyId } = req.params;
  const userId = req.user?.id;
  const { message } = req.body;

  // Check if academy exists
  const { data: academy } = await supabase
    .from('Academy')
    .select('id')
    .eq('id', academyId)
    .single();

  if (!academy) {
    throw createError('Academy not found', 404);
  }

  const { data: enquiry, error } = await supabase
    .from('Enquiry')
    .insert({
      message,
      userId,
      academyId,
      status: 'PENDING',
    })
    .select('*')
    .single();

  if (error) {
    throw createError('Failed to send enquiry', 500);
  }

  res.status(201).json({
    success: true,
    message: 'Enquiry sent successfully',
    data: enquiry,
  });
};

// Get user's enquiries
export const getUserEnquiries = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const { data: enquiries, error } = await supabase
    .from('Enquiry')
    .select(`
      *,
      academy:Academy(id, name, type, location)
    `)
    .eq('userId', userId)
    .order('createdAt', { ascending: false });

  if (error) {
    throw createError('Failed to fetch enquiries', 500);
  }

  res.json({
    success: true,
    data: enquiries,
  });
};
