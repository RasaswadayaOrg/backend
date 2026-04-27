const fs = require('fs');
const file = 'src/controllers/admin.controller.ts';
let code = fs.readFileSync(file, 'utf8');

const storeOwnerCode = `
export const createStoreOwner = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, fullName, phone, city, avatarUrl } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser) {
      if (existingUser.role === 'STORE_OWNER') {
        return res.status(400).json({ success: false, message: 'User is already a store owner' });
      }
      
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          role: 'STORE_OWNER',
          fullName: fullName || existingUser.fullName,
          phone: phone || existingUser.phone,
          city: city || existingUser.city,
          avatarUrl: avatarUrl || existingUser.avatarUrl
        },
        select: { id: true, email: true, fullName: true, role: true }
      });
      
      return res.json({ success: true, data: updatedUser });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);
    
    const newStoreOwner = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        phone,
        city,
        avatarUrl,
        role: 'STORE_OWNER'
      },
      select: { id: true, email: true, fullName: true, role: true }
    });
    
    res.status(201).json({ success: true, data: newStoreOwner });
  } catch (error) {
    console.error('Create store owner error:', error);
    res.status(500).json({ success: false, message: 'Failed to create store owner' });
  }
};

export const updateStoreOwner = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { email, password, fullName, phone, city, avatarUrl } = req.body;
    
    const updateData: any = {
      fullName,
      phone,
      city,
      avatarUrl
    };
    
    if (email) updateData.email = email;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    
    const updatedStoreOwner = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, fullName: true, phone: true, city: true, role: true }
    });
    
    res.json({ success: true, data: updatedStoreOwner });
  } catch (error) {
    console.error('Update store owner error:', error);
    res.status(500).json({ success: false, message: 'Failed to update store owner' });
  }
};
`;

code += "\n\n// Store Owners\n" + storeOwnerCode;
fs.writeFileSync(file, code);
