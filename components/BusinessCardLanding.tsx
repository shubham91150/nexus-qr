import React, { useEffect, useState } from 'react';
import { BusinessCard, getBusinessCardBySlug, generateVCardFromCard } from '../services/businessCardService';
import {
  Phone, Mail, MapPin, Globe, Briefcase, Building2, Download, Share2,
  Linkedin, Twitter, Instagram, Facebook, Github, Youtube
} from 'lucide-react';

interface Props {
  slug: string;
}

// Social Media Icon Component
const SocialIcon: React.FC<{ type: string; url: string; color: string }> = ({ type, url, color }) => {
  const icons: Record<string, React.ReactNode> = {
    linkedin: <Linkedin size={20} />,
    twitter: <Twitter size={20} />,
    instagram: <Instagram size={20} />,
    facebook: <Facebook size={20} />,
    github: <Github size={20} />,
    youtube: <Youtube size={20} />,
  };

  if (!url) return null;

  const fullUrl = url.startsWith('http') ? url : `https://${url}`;

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {icons[type] || <Globe size={20} />}
    </a>
  );
};

// Download VCard Function
const downloadVCard = (card: BusinessCard) => {
  const vcard = generateVCardFromCard(card);
  const blob = new Blob([vcard], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${card.first_name}_${card.last_name}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Share Function
const shareCard = async (card: BusinessCard, slug: string) => {
  const url = `${window.location.origin}/card/${slug}`;
  const text = `Check out ${card.first_name} ${card.last_name}'s digital business card`;

  if (navigator.share) {
    try {
      await navigator.share({ title: text, url });
    } catch (err) {
      console.log('Share cancelled');
    }
  } else {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  }
};

// Professional Template
const ProfessionalTemplate: React.FC<{ card: BusinessCard; slug: string }> = ({ card, slug }) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header with gradient */}
      <div
        className="h-32 relative"
        style={{ background: `linear-gradient(135deg, ${card.theme_color}, ${card.theme_color}dd)` }}
      >
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-200">
            {card.photo_url ? (
              <img src={card.photo_url} alt={card.first_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
                {card.first_name?.[0]}{card.last_name?.[0]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 pb-6 px-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{card.first_name} {card.last_name}</h1>
        {card.title && <p className="text-gray-600 mt-1">{card.title}</p>}
        {card.company && (
          <p className="text-gray-500 text-sm mt-1 flex items-center justify-center gap-1">
            <Building2 size={14} /> {card.company}
          </p>
        )}

        {/* Contact Info */}
        <div className="mt-6 space-y-3">
          {card.mobile && (
            <a href={`tel:${card.mobile}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${card.theme_color}20`, color: card.theme_color }}>
                <Phone size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500">Mobile</p>
                <p className="text-sm font-medium text-gray-900">{card.mobile}</p>
              </div>
            </a>
          )}

          {card.email && (
            <a href={`mailto:${card.email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${card.theme_color}20`, color: card.theme_color }}>
                <Mail size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{card.email}</p>
              </div>
            </a>
          )}

          {card.website && (
            <a href={card.website.startsWith('http') ? card.website : `https://${card.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${card.theme_color}20`, color: card.theme_color }}>
                <Globe size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500">Website</p>
                <p className="text-sm font-medium text-gray-900">{card.website}</p>
              </div>
            </a>
          )}

          {(card.city || card.country) && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${card.theme_color}20`, color: card.theme_color }}>
                <MapPin size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm font-medium text-gray-900">
                  {[card.city, card.state, card.country].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-3 mt-6">
          <SocialIcon type="linkedin" url={card.linkedin || ''} color={card.theme_color} />
          <SocialIcon type="twitter" url={card.twitter || ''} color={card.theme_color} />
          <SocialIcon type="instagram" url={card.instagram || ''} color={card.theme_color} />
          <SocialIcon type="facebook" url={card.facebook || ''} color={card.theme_color} />
          <SocialIcon type="github" url={card.github || ''} color={card.theme_color} />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => downloadVCard(card)}
            className="flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: card.theme_color }}
          >
            <Download size={18} /> Save Contact
          </button>
          <button
            onClick={() => shareCard(card, slug)}
            className="w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-colors hover:bg-gray-50"
            style={{ borderColor: card.theme_color, color: card.theme_color }}
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="py-3 text-center border-t border-gray-100">
        <p className="text-xs text-gray-400">Created with Nexus QR</p>
      </div>
    </div>
  </div>
);

// Modern Template (Dark)
const ModernTemplate: React.FC<{ card: BusinessCard; slug: string }> = ({ card, slug }) => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
    <div className="w-full max-w-md">
      {/* Profile Section */}
      <div className="text-center mb-8">
        <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden bg-gray-800 mb-4 ring-4 ring-gray-700">
          {card.photo_url ? (
            <img src={card.photo_url} alt={card.first_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500">
              {card.first_name?.[0]}{card.last_name?.[0]}
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">{card.first_name} {card.last_name}</h1>
        {card.title && <p className="mt-1" style={{ color: card.theme_color }}>{card.title}</p>}
        {card.company && <p className="text-gray-400 text-sm mt-1">{card.company}</p>}
      </div>

      {/* Contact Cards */}
      <div className="space-y-3">
        {card.mobile && (
          <a href={`tel:${card.mobile}`} className="block p-4 bg-gray-800 rounded-xl hover:bg-gray-750 transition-colors">
            <div className="flex items-center gap-4">
              <Phone size={20} style={{ color: card.theme_color }} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                <p className="text-white font-medium">{card.mobile}</p>
              </div>
            </div>
          </a>
        )}

        {card.email && (
          <a href={`mailto:${card.email}`} className="block p-4 bg-gray-800 rounded-xl hover:bg-gray-750 transition-colors">
            <div className="flex items-center gap-4">
              <Mail size={20} style={{ color: card.theme_color }} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                <p className="text-white font-medium">{card.email}</p>
              </div>
            </div>
          </a>
        )}

        {card.website && (
          <a href={card.website.startsWith('http') ? card.website : `https://${card.website}`} target="_blank" rel="noopener noreferrer" className="block p-4 bg-gray-800 rounded-xl hover:bg-gray-750 transition-colors">
            <div className="flex items-center gap-4">
              <Globe size={20} style={{ color: card.theme_color }} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Website</p>
                <p className="text-white font-medium">{card.website}</p>
              </div>
            </div>
          </a>
        )}
      </div>

      {/* Social Links */}
      <div className="flex justify-center gap-4 mt-8">
        <SocialIcon type="linkedin" url={card.linkedin || ''} color={card.theme_color} />
        <SocialIcon type="twitter" url={card.twitter || ''} color={card.theme_color} />
        <SocialIcon type="instagram" url={card.instagram || ''} color={card.theme_color} />
        <SocialIcon type="github" url={card.github || ''} color={card.theme_color} />
      </div>

      {/* Action Button */}
      <button
        onClick={() => downloadVCard(card)}
        className="w-full mt-8 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2"
        style={{ backgroundColor: card.theme_color }}
      >
        <Download size={20} /> Save Contact
      </button>

      <p className="text-center text-gray-600 text-xs mt-6">Created with Nexus QR</p>
    </div>
  </div>
);

// Minimal Template
const MinimalTemplate: React.FC<{ card: BusinessCard; slug: string }> = ({ card, slug }) => (
  <div className="min-h-screen bg-white flex items-center justify-center p-4">
    <div className="w-full max-w-sm text-center">
      {/* Photo */}
      <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gray-100 mb-6">
        {card.photo_url ? (
          <img src={card.photo_url} alt={card.first_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-light text-gray-400">
            {card.first_name?.[0]}{card.last_name?.[0]}
          </div>
        )}
      </div>

      {/* Name */}
      <h1 className="text-xl font-light text-gray-900 tracking-wide">
        {card.first_name} {card.last_name}
      </h1>
      {card.title && <p className="text-sm text-gray-500 mt-2">{card.title}</p>}
      {card.company && <p className="text-sm text-gray-400">{card.company}</p>}

      {/* Divider */}
      <div className="w-12 h-px mx-auto my-6" style={{ backgroundColor: card.theme_color }} />

      {/* Contact */}
      <div className="space-y-2 text-sm">
        {card.mobile && <a href={`tel:${card.mobile}`} className="block text-gray-600 hover:text-gray-900">{card.mobile}</a>}
        {card.email && <a href={`mailto:${card.email}`} className="block text-gray-600 hover:text-gray-900">{card.email}</a>}
        {card.website && (
          <a href={card.website.startsWith('http') ? card.website : `https://${card.website}`} target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:text-gray-900">
            {card.website.replace(/^https?:\/\//, '')}
          </a>
        )}
      </div>

      {/* Social */}
      <div className="flex justify-center gap-4 mt-6">
        {card.linkedin && <a href={card.linkedin} target="_blank" rel="noopener noreferrer"><Linkedin size={18} className="text-gray-400 hover:text-gray-600" /></a>}
        {card.twitter && <a href={card.twitter} target="_blank" rel="noopener noreferrer"><Twitter size={18} className="text-gray-400 hover:text-gray-600" /></a>}
        {card.instagram && <a href={card.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={18} className="text-gray-400 hover:text-gray-600" /></a>}
      </div>

      {/* Save Button */}
      <button
        onClick={() => downloadVCard(card)}
        className="mt-8 px-8 py-2 border rounded-full text-sm font-medium transition-colors hover:bg-gray-50"
        style={{ borderColor: card.theme_color, color: card.theme_color }}
      >
        Save Contact
      </button>
    </div>
  </div>
);

// Main Component
export const BusinessCardLanding: React.FC<Props> = ({ slug }) => {
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCard = async () => {
      setLoading(true);
      const result = await getBusinessCardBySlug(slug);
      if (result.success && result.data) {
        setCard(result.data);
      } else {
        setError(result.error || 'Card not found');
      }
      setLoading(false);
    };

    fetchCard();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">404</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Card Not Found</h1>
          <p className="text-gray-500 text-sm">This business card doesn't exist or has been deactivated.</p>
        </div>
      </div>
    );
  }

  // Render based on template
  switch (card.template) {
    case 'modern':
      return <ModernTemplate card={card} slug={slug} />;
    case 'minimal':
      return <MinimalTemplate card={card} slug={slug} />;
    case 'professional':
    default:
      return <ProfessionalTemplate card={card} slug={slug} />;
  }
};

export default BusinessCardLanding;
