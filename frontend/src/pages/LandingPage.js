import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Layout, Users, Calendar, CheckSquare, Zap, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';

const features = [
  { icon: Layout, title: 'Tableaux visuels', desc: 'Organisez vos projets avec des tableaux, listes et cartes intuitifs.', span: 'col-span-1' },
  { icon: CheckSquare, title: 'Checklists', desc: 'Decomposez vos taches en sous-etapes et suivez votre progression.', span: 'col-span-1' },
  { icon: Calendar, title: 'Dates limites', desc: 'Ne manquez plus jamais une deadline avec le suivi des echeances.', span: 'col-span-1 md:col-span-2' },
  { icon: Users, title: 'Collaboration', desc: 'Travaillez en temps reel avec vos camarades sur les memes tableaux.', span: 'col-span-1' },
  { icon: Zap, title: 'Drag & Drop', desc: 'Deplacez vos cartes entre les listes en un geste fluide.', span: 'col-span-1' },
  { icon: Shield, title: 'Tags & Priorites', desc: 'Categorisez et priorisez vos taches pour rester focus.', span: 'col-span-1 md:col-span-2' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-cyan-50/30 dark:from-indigo-950/20 dark:via-transparent dark:to-transparent" />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="uppercase text-xs font-bold tracking-widest text-primary mb-6" data-testid="hero-label">
                Gestion de taches pour etudiants
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                Organisez vos etudes,{' '}
                <span className="text-primary">sans stress.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed">
                StudyBoard vous aide a gerer vos cours, projets et revisions avec des tableaux visuels inspires de Trello. Simple, rapide, collaboratif.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  data-testid="hero-cta-btn"
                  size="lg"
                  className="rounded-full px-8 shadow-md hover:shadow-lg active:scale-95 transition-all"
                  onClick={() => navigate(user ? '/dashboard' : '/auth')}
                >
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  data-testid="hero-demo-btn"
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Decouvrir
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-xl" />
                <div className="relative bg-card border border-border/50 rounded-2xl shadow-xl p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                    <span className="text-sm text-muted-foreground ml-2">Mon Projet</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['A faire', 'En cours', 'Termine'].map((col, ci) => (
                      <div key={col} className="bg-secondary/50 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col}</p>
                        {[...Array(ci === 0 ? 3 : ci === 1 ? 2 : 1)].map((_, i) => (
                          <div key={i} className="bg-card rounded-md p-2 border border-border/30 shadow-sm">
                            <div className="h-2 w-full bg-muted rounded mb-1.5" />
                            <div className="h-2 w-2/3 bg-muted/70 rounded" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="uppercase text-xs font-bold tracking-widest text-primary mb-4">Fonctionnalites</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Tout ce qu'il faut pour reussir
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`${f.span} bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-7 hover:-translate-y-1 transition-transform duration-300 group`}
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
            Pret a organiser vos etudes ?
          </h2>
          <p className="text-muted-foreground mb-10 text-base md:text-lg">
            Rejoignez des milliers d'etudiants qui utilisent StudyBoard pour mieux s'organiser.
          </p>
          <Button
            data-testid="cta-start-btn"
            size="lg"
            className="rounded-full px-10 shadow-md hover:shadow-lg active:scale-95 transition-all"
            onClick={() => navigate(user ? '/dashboard' : '/auth')}
          >
            Creer mon premier tableau
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>StudyBoard &copy; {new Date().getFullYear()}</p>
          <p>Fait avec passion pour les etudiants</p>
        </div>
      </footer>
    </div>
  );
}
