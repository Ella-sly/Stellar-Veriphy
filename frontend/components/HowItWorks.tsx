'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    number: 1,
    title: 'Upload Media',
    description: 'Submit your digital content and metadata',
  },
  {
    number: 2,
    title: 'Hash & Manifest',
    description: 'Generate cryptographic hashes of content and manifest',
  },
  {
    number: 3,
    title: 'TEE Attestation',
    description: 'Verify in a Trusted Execution Environment',
  },
  {
    number: 4,
    title: 'On-Chain Certificate',
    description: 'Immutable proof recorded on Stellar blockchain',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 px-4 md:px-8 bg-white dark:bg-gray-800">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            A four-step verification pipeline for content authenticity
          </p>
        </motion.div>

        {/* Desktop: Horizontal stepper */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center flex-1"
                >
                  <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xl mb-4 shadow-lg">
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-center">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 text-center mt-2">
                    {step.description}
                  </p>
                </motion.div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 bg-blue-200 dark:bg-blue-900 mx-4 mb-8" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: Vertical stepper */}
        <div className="md:hidden space-y-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="flex gap-4"
            >
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                  <div className="w-1 h-12 bg-blue-200 dark:bg-blue-900 mt-2" />
                )}
              </div>
              <div className="pb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
