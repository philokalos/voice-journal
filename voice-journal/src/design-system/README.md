# Voice Journal Design System

A comprehensive design system for the Voice Journal application, providing consistent UI components and design tokens.

## Design Tokens

The design system is built around a set of centralized design tokens that define colors, spacing, typography, and other design values.

### Usage
```typescript
import { tokens } from '../design-system'

// Access colors
const primaryColor = tokens.colors.primary
const neutralGray = tokens.colors.neutral[500]

// Access spacing
const mediumSpacing = tokens.spacing.md

// Access typography
const baseSize = tokens.typography.sizes.base
```

## Components

### Button
Flexible button component with multiple variants and sizes.

```typescript
import { Button } from '../design-system'

<Button variant="primary" size="md" icon={<SomeIcon />}>
  Click me
</Button>
```

**Variants:** `primary`, `secondary`, `ghost`, `glass`, `danger`
**Sizes:** `sm`, `md`, `lg`
**Props:** `loading`, `fullWidth`, `icon`, `iconPosition`

### Input
Text input and textarea component with glass morphism design.

```typescript
import { Input } from '../design-system'

<Input
  placeholder="Enter text..."
  multiline
  rows={4}
  icon={<EmailIcon />}
/>
```

**Variants:** `default`, `glass`
**Sizes:** `sm`, `md`, `lg`
**Props:** `multiline`, `rows`, `icon`, `label`, `error`, `helperText`

### Card
Container component with glass morphism effects.

```typescript
import { Card, CardHeader, CardContent, CardFooter } from '../design-system'

<Card variant="glass" padding="lg" hoverable>
  <CardHeader>Header content</CardHeader>
  <CardContent>Main content</CardContent>
  <CardFooter>Footer content</CardFooter>
</Card>
```

**Variants:** `glass`, `glass-strong`, `solid`, `elevated`
**Padding:** `none`, `sm`, `md`, `lg`, `xl`
**Props:** `hoverable`, `clickable`

### Icon
SVG icon wrapper with consistent sizing.

```typescript
import { Icon, MicrophoneIcon } from '../design-system'

<Icon size="md">
  <path d="..." />
</Icon>

// Or use predefined icons
<MicrophoneIcon size="lg" />
```

**Sizes:** `sm`, `md`, `lg`, `xl`
**Variants:** `outline`, `solid`
**Props:** `spin`

### Badge
Status indicators and labels.

```typescript
import { Badge, StatusBadge } from '../design-system'

<Badge variant="success" size="md">Success</Badge>
<StatusBadge status="online" />
```

**Variants:** `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`
**Sizes:** `sm`, `md`, `lg`
**Props:** `dot`

## Utility Functions

### Theme Utilities
```typescript
import { createGlassEffect, createGradientBackground, getColor } from '../design-system'

// Create glass morphism effect
const glassStyle = createGlassEffect(0.1)

// Create gradient background
const gradientStyle = createGradientBackground('#6366f1', '#8b5cf6')

// Get color from tokens
const primaryColor = getColor('primary')
const neutralColor = getColor('neutral.500')
```

## Design Principles

### Glass Morphism
The design system heavily uses glass morphism effects with:
- Semi-transparent backgrounds
- Backdrop blur effects
- Subtle borders and shadows
- Neumorphism-inspired depth

### Spacing System
Based on an 8px grid system with consistent spacing values:
- `xs`: 6px
- `sm`: 12px  
- `md`: 24px
- `lg`: 36px
- `xl`: 48px
- `2xl`: 60px
- `3xl`: 72px
- `4xl`: 96px

### Typography Scale
Consistent font sizes and weights:
- Sizes: `xs` (12px) to `4xl` (32px)
- Weights: `normal` (400), `medium` (500), `semibold` (600), `bold` (700)

### Color System
- Primary: Indigo (`#6366f1`)
- Secondary: Purple (`#8b5cf6`)
- Neutral scale: Gray 50-900
- Semantic colors: Success, Warning, Error, Info

## Mobile Responsiveness

Components automatically adapt to mobile devices:
- Touch-friendly button sizes (44px minimum)
- Appropriate spacing adjustments
- Responsive typography scaling
- Safe area inset support

## Migration Guide

To migrate existing components:

1. Import design system components:
```typescript
import { Button, Input, Card } from '../design-system'
```

2. Replace CSS classes with component props:
```typescript
// Before
<button className="glass-button">Click</button>

// After  
<Button variant="glass">Click</Button>
```

3. Use design tokens for custom styling:
```typescript
// Before
style={{ padding: '24px', color: '#525252' }}

// After
style={{ padding: tokens.spacing.md, color: tokens.colors.neutral[600] }}
```

## Best Practices

1. **Consistency**: Always use design system components instead of custom styling
2. **Tokens**: Reference design tokens for spacing, colors, and typography
3. **Accessibility**: Components include proper ARIA labels and keyboard navigation
4. **Performance**: Components are optimized for React rendering
5. **Mobile-First**: Design for mobile devices first, then enhance for desktop