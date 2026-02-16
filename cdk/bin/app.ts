#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DaleStack } from '../lib/stack.js';

const app = new cdk.App();
new DaleStack(app, 'DaleStack');
