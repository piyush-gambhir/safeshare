"use client"

import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Shield, Zap, Server } from "lucide-react"
import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"

export default function Hero() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background pointer-events-none"></div>

      {/* Animated circles */}
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-40 right-1/4 w-72 h-72 bg-secondary/10 rounded-full blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <motion.div
        ref={ref}
        variants={container}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="flex flex-col items-center text-center py-12 md:py-20 px-4 space-y-8 relative z-10"
      >
        <motion.div variants={item}>
          <Badge variant="outline" className="px-3 py-1 text-sm">
            Secure • Private • Fast
          </Badge>
        </motion.div>

        <motion.h1
          variants={item}
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600 dark:from-primary dark:to-blue-400 leading-tight"
        >
          SafeShare
          <span className="block text-lg sm:text-xl md:text-2xl font-medium text-foreground mt-2">
            Secure Peer-to-Peer File Transfer
          </span>
        </motion.h1>

        <motion.p variants={item} className="max-w-[700px] text-lg sm:text-xl text-muted-foreground leading-relaxed">
          Secure, decentralized file sharing directly between browsers.
          <span className="block mt-2">No uploads, no servers, just peer-to-peer transfers.</span>
        </motion.p>

        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-3xl mt-6">
          <div className="flex flex-col items-center p-4 rounded-lg border bg-background/50 backdrop-blur-sm hover:shadow-md transition-all">
            <Shield className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-medium">End-to-End Encrypted</h3>
            <p className="text-sm text-muted-foreground mt-1">Your files remain private and secure</p>
          </div>

          <div className="flex flex-col items-center p-4 rounded-lg border bg-background/50 backdrop-blur-sm hover:shadow-md transition-all">
            <Zap className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-medium">Lightning Fast</h3>
            <p className="text-sm text-muted-foreground mt-1">Direct transfers with no middleman</p>
          </div>

          <div className="flex flex-col items-center p-4 rounded-lg border bg-background/50 backdrop-blur-sm hover:shadow-md transition-all">
            <Server className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-medium">No Storage</h3>
            <p className="text-sm text-muted-foreground mt-1">Files never touch our servers</p>
          </div>
        </motion.div>

        <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button size="lg" className="rounded-full px-8 relative overflow-hidden group">
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 group-hover:animate-shimmer"></span>
            Get Started
          </Button>
          <Button size="lg" variant="outline" className="rounded-full px-8">
            Learn More
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
