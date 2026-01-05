# Attribution Notice

This project is a fork of [Papermark](https://github.com/mfts/papermark) - The open-source DocSend alternative.

## Original License

The original Papermark project is licensed under AGPLv3 with certain Enterprise Edition (EE) components under a commercial license.

## Modifications

This fork has been modified for self-hosted deployment at doc.rwa.nexus:

1. **Enterprise Edition Disabled**: The `/ee` and `/app/(ee)` directories have been disabled to comply with the commercial license requirements.
2. **Custom Domain Configuration**: Modified `middleware.ts` to support `doc.rwa.nexus` as the primary application host.
3. **Environment Configuration**: Configured for local PostgreSQL database.

## Source Code Availability (AGPLv3 Compliance)

As required by the AGPLv3 license, the complete source code for this deployment is available at:
https://github.com/rwanexus/doc

## Original Authors

- Papermark, Inc. (https://papermark.com)
- Marc Seitz (@mfts)

## License

This fork maintains the same AGPLv3 license as the original project for non-EE components.
See LICENSE file for details.
