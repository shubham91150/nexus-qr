import { supabase, generateShortCode } from '../lib/supabase';

// Business Card Interface
export interface BusinessCard {
  id?: string;
  user_id?: string;
  slug: string;

  // Basic Info
  first_name: string;
  last_name: string;
  title?: string;
  company?: string;

  // Contact Numbers
  mobile?: string;
  phone?: string;
  fax?: string;

  // Emails
  email?: string;
  work_email?: string;

  // Address
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;

  // Web & Social
  website?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  github?: string;
  youtube?: string;
  tiktok?: string;

  // Profile Photo
  photo_url?: string;

  // Design Settings
  template: 'professional' | 'modern' | 'minimal' | 'creative' | 'elegant';
  theme_color: string;
  bg_color: string;
  text_color: string;

  // Metadata
  is_active?: boolean;
  view_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Generate unique slug from name
export function generateSlug(firstName: string, lastName: string): string {
  const namePart = `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const randomPart = generateShortCode(4);
  return `${namePart}-${randomPart}`;
}

// Create a new business card
export async function createBusinessCard(
  card: Omit<BusinessCard, 'id' | 'slug' | 'created_at' | 'updated_at' | 'view_count'>
): Promise<{ success: boolean; data?: BusinessCard; error?: string }> {
  try {
    const slug = generateSlug(card.first_name, card.last_name);

    const { data, error } = await supabase
      .from('business_cards')
      .insert({
        ...card,
        slug,
        is_active: true,
        view_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating business card:', error);
    return { success: false, error: error.message };
  }
}

// Get business card by slug (public - for landing page)
export async function getBusinessCardBySlug(
  slug: string
): Promise<{ success: boolean; data?: BusinessCard; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('business_cards')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    // Increment view count
    await supabase.rpc('increment_card_view_count', { card_slug: slug });

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching business card:', error);
    return { success: false, error: error.message };
  }
}

// Get all business cards for a user
export async function getUserBusinessCards(
  userId: string
): Promise<{ success: boolean; data?: BusinessCard[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('business_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching user business cards:', error);
    return { success: false, error: error.message };
  }
}

// Update business card
export async function updateBusinessCard(
  id: string,
  updates: Partial<BusinessCard>
): Promise<{ success: boolean; data?: BusinessCard; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('business_cards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating business card:', error);
    return { success: false, error: error.message };
  }
}

// Delete business card
export async function deleteBusinessCard(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('business_cards')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting business card:', error);
    return { success: false, error: error.message };
  }
}

// Upload profile photo to Supabase Storage
export async function uploadCardPhoto(
  file: File,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Refresh session to ensure token is valid (fixes "exp" claim error)
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error('Session refresh error:', refreshError);
      return { success: false, error: 'Session expired. Please login again.' };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('business-card-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      // Check if it's a token expiration error
      if (uploadError.message.includes('exp') || uploadError.message.includes('token')) {
        return { success: false, error: 'Session expired. Please refresh the page and try again.' };
      }
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('business-card-photos')
      .getPublicUrl(fileName);

    return { success: true, url: data.publicUrl };
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    return { success: false, error: error.message };
  }
}

// Generate VCard string from business card
export function generateVCardFromCard(card: BusinessCard): string {
  let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';

  // Name
  vcard += `N:${card.last_name || ''};${card.first_name || ''};;;\n`;
  vcard += `FN:${card.first_name} ${card.last_name}\n`;

  // Organization & Title
  if (card.company) vcard += `ORG:${card.company}\n`;
  if (card.title) vcard += `TITLE:${card.title}\n`;

  // Phone Numbers
  if (card.mobile) vcard += `TEL;TYPE=CELL:${card.mobile}\n`;
  if (card.phone) vcard += `TEL;TYPE=WORK:${card.phone}\n`;
  if (card.fax) vcard += `TEL;TYPE=FAX:${card.fax}\n`;

  // Emails
  if (card.email) vcard += `EMAIL;TYPE=HOME:${card.email}\n`;
  if (card.work_email) vcard += `EMAIL;TYPE=WORK:${card.work_email}\n`;

  // Address
  if (card.street || card.city || card.state || card.zip || card.country) {
    vcard += `ADR;TYPE=WORK:;;${card.street || ''};${card.city || ''};${card.state || ''};${card.zip || ''};${card.country || ''}\n`;
  }

  // Website
  if (card.website) vcard += `URL:${card.website}\n`;

  // Photo URL
  if (card.photo_url) vcard += `PHOTO;VALUE=URI:${card.photo_url}\n`;

  // Social Media as URLs
  if (card.linkedin) vcard += `X-SOCIALPROFILE;TYPE=linkedin:${card.linkedin}\n`;
  if (card.twitter) vcard += `X-SOCIALPROFILE;TYPE=twitter:${card.twitter}\n`;

  vcard += 'END:VCARD';
  return vcard;
}

// Get landing page URL
export function getCardLandingPageUrl(slug: string): string {
  // In production, this would be your domain
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/card/${slug}`;
}
