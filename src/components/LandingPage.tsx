/**
 * Landing Page Component
 * Welcome screen with app overview and CTA to enter the tournament manager
 */

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import logoSvg from '../assets/logo.svg?url';
import '../lib/i18n/config';

interface LandingPageProps {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'da' : 'en';
    i18n.changeLanguage(newLang);
  };

  const tournamentTypes = [
    {
      key: 'singleElimination',
      icon: '🏆',
    },
    {
      key: 'doubleElimination',
      icon: '⚔️',
    },
    {
      key: 'roundRobin',
      icon: '🔄',
    },
    {
      key: 'swiss',
      icon: '♟️',
    },
    {
      key: 'freeForAll',
      icon: '🎯',
    },
  ];

  const features = [
    {
      titleKey: 'landing.features.clientSide.title',
      descriptionKey: 'landing.features.clientSide.description',
      icon: '💾',
    },
    {
      titleKey: 'landing.features.noAccount.title',
      descriptionKey: 'landing.features.noAccount.description',
      icon: '🔓',
    },
    {
      titleKey: 'landing.features.multilingual.title',
      descriptionKey: 'landing.features.multilingual.description',
      icon: '🌐',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header with Language Switcher */}
      <header className="container mx-auto px-4 py-6 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="gap-2"
        >
          🌐 {i18n.language === 'en' ? 'Dansk' : 'English'}
        </Button>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="relative">
            <img
              src={logoSvg}
              alt="TournaGen Logo"
              className="w-32 h-32 md:w-40 md:h-40 animate-in fade-in duration-1000"
            />
          </div>

          <div className="space-y-4 max-w-3xl">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight animate-in slide-in-from-bottom-4 duration-1000">
                {t('landing.hero.title')}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground/80 font-medium animate-in slide-in-from-bottom-4 duration-1000 delay-75">
                {t('landing.hero.tagline')}
              </p>
            </div>
            <p className="text-xl md:text-2xl text-muted-foreground animate-in slide-in-from-bottom-4 duration-1000 delay-100">
              {t('landing.hero.subtitle')}
            </p>
          </div>

          <Button
            size="lg"
            onClick={onEnter}
            className="text-lg px-8 py-6 animate-in slide-in-from-bottom-4 duration-1000 delay-200"
          >
            {t('landing.hero.cta')} →
          </Button>
        </div>
      </section>

      {/* Tournament Types Section */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            {t('landing.types.title')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('landing.types.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {tournamentTypes.map((type, index) => (
            <Card
              key={type.key}
              className="hover:shadow-lg transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100 + 300}ms` }}
            >
              <CardHeader className="text-center pb-3">
                <div className="text-4xl mb-2">{type.icon}</div>
                <CardTitle className="text-lg">
                  {t(`tournamentTypes.${type.key}`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm">
                  {t(`tournamentTypeDescriptions.${type.key}`)}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            {t('landing.features.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={feature.titleKey}
              className="text-center hover:shadow-lg transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100 + 500}ms` }}
            >
              <CardHeader>
                <div className="text-5xl mb-3">{feature.icon}</div>
                <CardTitle className="text-xl">
                  {t(feature.titleKey)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {t(feature.descriptionKey)}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <Card className="max-w-2xl mx-auto text-center bg-primary/5 border-primary/20">
          <CardHeader className="space-y-4 pt-8">
            <CardTitle className="text-3xl md:text-4xl">
              {t('landing.cta.title')}
            </CardTitle>
            <CardDescription className="text-lg">
              {t('landing.cta.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <Button
              size="lg"
              onClick={onEnter}
              className="text-lg px-10 py-6"
            >
              {t('landing.cta.button')} →
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t">
        <p>{t('landing.footer.text')}</p>
      </footer>
    </div>
  );
}
