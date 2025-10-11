/**
 * Landing Page Component - Redesigned
 * Centerpiece logo with orbiting tournament type icons
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import logoSvg from '../assets/logo.svg?url';
import '../lib/i18n/config';

interface LandingPageProps {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  const { t, i18n } = useTranslation();
  const [activeIcon, setActiveIcon] = useState<string | null>(null);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'da' : 'en';
    i18n.changeLanguage(newLang);
  };

  const tournamentTypes = [
    { key: 'singleElimination', icon: '🏆', angle: 0 },
    { key: 'doubleElimination', icon: '⚔️', angle: 72 },
    { key: 'roundRobin', icon: '🔄', angle: 144 },
    { key: 'swiss', icon: '♟️', angle: 216 },
    { key: 'freeForAll', icon: '🎯', angle: 288 },
  ];

  const features = [
    {
      title: t('landing.features.clientSide'),
      description: t('landing.features.clientSideDesc'),
      icon: '💾',
    },
    {
      title: t('landing.features.noAccount'),
      description: t('landing.features.noAccountDesc'),
      icon: '🔓',
    },
    {
      title: t('landing.features.multiLanguage'),
      description: t('landing.features.multiLanguageDesc'),
      icon: '🌐',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      {/* Header with Language Switcher */}
      <header className="fixed top-0 right-0 z-50 p-6">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="gap-2 backdrop-blur-sm bg-background/80"
        >
          🌐 {i18n.language === 'en' ? 'Dansk' : 'English'}
        </Button>
      </header>

      {/* Hero Section - Centerpiece Logo with Orbiting Icons */}
      <section className="relative px-4 py-8 md:py-12">
        <div className="relative w-full max-w-4xl mx-auto min-h-[60vh] flex items-center justify-center">
          <div className="relative w-full">
            {/* Central Logo */}
            <div className="flex items-center justify-center">
              <img
                src={logoSvg}
                alt="TournaGen Logo"
                className="w-64 h-64 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem] animate-in fade-in zoom-in duration-1000"
                style={{ filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.15))' }}
              />
            </div>

            {/* Orbiting Tournament Type Icons */}
            <TooltipProvider delayDuration={200}>
              <div className="absolute inset-0 pointer-events-none">
                {tournamentTypes.map((type) => (
                  <div
                    key={type.key}
                    className="absolute top-1/2 left-1/2 pointer-events-auto"
                    style={{
                      animation: `orbit-${type.key} 60s linear infinite`,
                    }}
                  >
                    <Tooltip open={activeIcon === type.key}>
                      <TooltipTrigger asChild>
                        <button
                          className="absolute text-5xl md:text-6xl lg:text-7xl transition-all duration-300 hover:scale-125 focus:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
                          style={{
                            left: 'calc(66px + 6.6vw)',
                            top: '0',
                            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2))',
                            animation: `counter-rotate-${type.key} 60s linear infinite`,
                          }}
                          onClick={() => setActiveIcon(activeIcon === type.key ? null : type.key)}
                          onMouseEnter={() => setActiveIcon(type.key)}
                          onMouseLeave={() => setActiveIcon(null)}
                          aria-label={t(`tournamentTypes.${type.key}`)}
                        >
                          {type.icon}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs text-center"
                        sideOffset={10}
                      >
                        <p className="font-semibold mb-1">
                          {t(`tournamentTypes.${type.key}`)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t(`landing.tournamentIcons.${type.key}`)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* App Name Display */}
        <div className="w-full text-center mt-4 md:mt-6">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300" style={{ textShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
            TournaGen
          </h1>
          {/* Tagline */}
          <p className="text-lg md:text-xl text-muted-foreground mt-3 md:mt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400">
            {t('landing.hero.tagline')}
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-4 md:py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="p-4 text-center hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 border-muted/50"
              style={{ animationDelay: `${index * 100 + 500}ms` }}
            >
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className="font-bold text-base mb-1.5">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
          <Button
            size="lg"
            onClick={onEnter}
            className="text-xl px-12 py-7 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            {t('landing.hero.cta')} →
          </Button>
        </div>
      </section>

      {/* CSS for Orbit Animation */}
      <style>{`
        @keyframes orbit-singleElimination {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-doubleElimination {
          from { transform: rotate(72deg); }
          to { transform: rotate(432deg); }
        }
        @keyframes orbit-roundRobin {
          from { transform: rotate(144deg); }
          to { transform: rotate(504deg); }
        }
        @keyframes orbit-swiss {
          from { transform: rotate(216deg); }
          to { transform: rotate(576deg); }
        }
        @keyframes orbit-freeForAll {
          from { transform: rotate(288deg); }
          to { transform: rotate(648deg); }
        }

        /* Counter-rotation to keep icons upright */
        @keyframes counter-rotate-singleElimination {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        @keyframes counter-rotate-doubleElimination {
          from { transform: translate(-50%, -50%) rotate(-72deg); }
          to { transform: translate(-50%, -50%) rotate(-432deg); }
        }
        @keyframes counter-rotate-roundRobin {
          from { transform: translate(-50%, -50%) rotate(-144deg); }
          to { transform: translate(-50%, -50%) rotate(-504deg); }
        }
        @keyframes counter-rotate-swiss {
          from { transform: translate(-50%, -50%) rotate(-216deg); }
          to { transform: translate(-50%, -50%) rotate(-576deg); }
        }
        @keyframes counter-rotate-freeForAll {
          from { transform: translate(-50%, -50%) rotate(-288deg); }
          to { transform: translate(-50%, -50%) rotate(-648deg); }
        }
      `}</style>
    </div>
  );
}
